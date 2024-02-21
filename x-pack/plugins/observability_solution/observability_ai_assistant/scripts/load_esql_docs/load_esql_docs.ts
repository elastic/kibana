/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { run } from '@kbn/dev-cli-runner';
import $, { load } from 'cheerio';
import { SingleBar } from 'cli-progress';
import FastGlob from 'fast-glob';
import Fs from 'fs/promises';
import { once, partition } from 'lodash';
import pLimit from 'p-limit';
import Path from 'path';
import git, { SimpleGitProgressEvent } from 'simple-git';
import yargs, { Argv } from 'yargs';
import { extractSections } from './extract_sections';
import { formatEsqlExamples } from './format_esql_examples';

yargs(process.argv.slice(2))
  .command(
    '*',
    'Extract ES|QL documentation for the Observability AI Assistant',
    (y: Argv) =>
      y.option('logLevel', {
        describe: 'Log level',
        string: true,
        default: process.env.LOG_LEVEL || 'info',
        choices: ['info', 'debug', 'silent', 'verbose'],
      }),
    (argv) => {
      run(
        async ({ log }) => {
          const builtDocsDir = Path.join(__dirname, '../../../../../../built-docs');

          log.debug(`Looking in ${builtDocsDir} for built-docs repository`);

          const dirExists = await Fs.stat(builtDocsDir);

          const getProgressHandler = () => {
            let stage: string = '';
            let method: string = '';
            const loader: SingleBar = new SingleBar({
              barsize: 25,
              format: `{phase} {bar} {percentage}%`,
            });

            const start = once(() => {
              loader.start(100, 0, { phase: 'initializing' });
            });

            return {
              progress: (event: SimpleGitProgressEvent) => {
                start();
                if (event.stage !== stage || event.method !== method) {
                  stage = event.stage;
                  method = event.method;
                }
                loader.update(event.progress, { phase: event.method + '/' + event.stage });
              },
              stop: () => loader.stop(),
            };
          };

          if (!dirExists) {
            log.info('Cloning built-docs repo. This will take a while.');

            const { progress, stop } = getProgressHandler();
            await git(Path.join(builtDocsDir, '..'), {
              progress,
            }).clone(`https://github.com/elastic/built-docs`, builtDocsDir, ['--depth', '1']);

            stop();
          }

          const { progress, stop } = getProgressHandler();

          const builtDocsGit = git(builtDocsDir, { progress });

          log.debug('Initializing simple-git');
          await builtDocsGit.init();

          log.info('Making sure built-docs is up to date');
          await builtDocsGit.pull();

          const files = FastGlob.sync(
            `${builtDocsDir}/html/en/elasticsearch/reference/master/esql*.html`
          );

          if (!files) {
            throw new Error('No files found');
          }

          const limiter = pLimit(10);

          stop();

          log.info(`Processing ${files.length} files`);

          const documents: Array<Array<{ title: string; content: string }>> = await Promise.all(
            files.map((file) =>
              limiter(async () => {
                const fileContents = await Fs.readFile(file);
                const $element = load(fileContents.toString())('*');

                function getSimpleText() {
                  $element.remove('.navfooter');
                  $element.remove('#sticky_content');
                  $element.find('code').each(function () {
                    $(this).replaceWith('`' + $(this).text() + '`');
                  });
                  return $element
                    .find('.section,section,.part')
                    .last()
                    .text()
                    .replaceAll(/([\n]\s*){2,}/g, '\n');
                }

                switch (Path.basename(file)) {
                  case 'esql-commands.html':
                    return extractSections($element);

                  case 'esql-limitations.html':
                    return [
                      {
                        title: 'Limitations',
                        content: getSimpleText(),
                      },
                    ];

                  case 'esql-syntax.html':
                    return [
                      {
                        title: 'Syntax',
                        content: getSimpleText(),
                      },
                    ];
                  case 'esql.html':
                    return [
                      {
                        title: 'Overview',
                        content: getSimpleText().replace(
                          /The ES\|QL documentation is organized in these sections(.*)$/,
                          ''
                        ),
                      },
                    ];

                  case 'esql-functions-operators.html':
                    const sections = extractSections($element);

                    const searches = [
                      'Binary operators',
                      'Equality',
                      'Inequality',
                      'Less than',
                      'Greater than',
                      'Add +',
                      'Subtract -',
                      'Multiply *',
                      'Divide /',
                      'Modulus %',
                      'Unary operators',
                      'Logical operators',
                      'IS NULL',
                    ];

                    const matches = [
                      'CIDR_MATCH',
                      'ENDS_WITH',
                      'IN',
                      'IS_FINITE',
                      'IS_INFINITE',
                      'IS_NAN',
                      'LIKE',
                      'RLIKE',
                      'STARTS_WITH',
                    ];

                    const [operatorSections, allOtherSections] = partition(sections, (section) => {
                      return (
                        matches.includes(section.title) ||
                        searches.some((search) =>
                          section.title.toLowerCase().startsWith(search.toLowerCase())
                        )
                      );
                    });

                    return allOtherSections.concat({
                      title: 'Operators',
                      content: operatorSections
                        .map(({ title, content }) => `${title}\n${content}`)
                        .join('\n'),
                    });

                  default:
                    break;
                }
                return [];
              })
            )
          );

          const flattened = documents.flat().filter((doc) => {
            return !doc.title.startsWith('ES|QL');
          });

          const outDir = Path.join(__dirname, '../../server/functions/esql/docs');

          log.info(`Writing ${flattened.length} documents to disk to ${outDir}`);

          log.debug(`Clearing ${outDir}`);

          await Fs.rm(outDir, { recursive: true });

          await Fs.mkdir(outDir);

          await Promise.all(
            flattened.map((doc) =>
              limiter(async () => {
                const fileName = Path.join(
                  outDir,
                  `esql-${doc.title.replaceAll(' ', '-').toLowerCase()}.txt`
                );

                // We ask the LLM to output queries wrapped in ```esql...```,
                // so we try to format ES|QL examples in the docs in the same
                // way. The hope is that this creates a stronger relation in the
                // output.
                const formattedContent = formatEsqlExamples(doc.content);

                log.debug({
                  content: doc.content,
                  formattedContent,
                });

                await Fs.writeFile(fileName, formattedContent);
              })
            )
          );
        },
        { log: { defaultLevel: argv.logLevel as any }, flags: { allowUnexpected: true } }
      );
    }
  )
  .parse();
