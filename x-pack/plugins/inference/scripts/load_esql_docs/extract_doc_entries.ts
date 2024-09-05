/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs/promises';
import Path from 'path';
import fastGlob from 'fast-glob';
import $, { load, Cheerio, AnyNode } from 'cheerio';
import { partition } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import pLimit from 'p-limit';
import { ScriptInferenceClient } from '../util/kibana_client';
import { convertToMarkdown } from './convert_to_markdown';

interface ExtractedDocEntry {
  /** the title of the page **/
  title: string;
  /** the content that should be used **/
  content: string;
  /** LLM instructions to perform doc generation **/
  instructions?: string;
  /** if true, no page will be generated for this entry.
   * Note that the file will still be used as context to generate the other entries
   **/
  skip?: boolean;
}

/**
 * The pages that will be extracted but only used as context
 * for the LLM for the enhancement tasks of the documentation entries.
 */
const contextArticles = [
  'esql-kibana.html',
  'esql-query-api.html',
  'esql-limitations.html',
  'esql-cross-clusters.html',
  'esql-examples.html',
  'esql-metadata-fields.html',
  'esql-multi-index.html',
];

interface ExtractedPage {
  sourceFile: string;
  name: string;
  content: string;
}

export interface ExtractedCommandOrFunc {
  name: string;
  markdownContent: string;
}

export interface ExtractionOutput {
  commands: ExtractedCommandOrFunc[];
  functions: ExtractedCommandOrFunc[];
  pages: ExtractedPage[];
  /**
   * The list of file that were not processed
   */
  skippedFile: string[];
}

export async function extractDocEntries({
  builtDocsDir,
  log,
  inferenceClient,
}: {
  builtDocsDir: string;
  log: ToolingLog;
  inferenceClient: ScriptInferenceClient;
}): Promise<ExtractionOutput> {
  const files = await fastGlob(`${builtDocsDir}/html/en/elasticsearch/reference/master/esql*.html`);
  if (!files.length) {
    throw new Error('No files found');
  }

  const output: ExtractionOutput = {
    commands: [],
    functions: [],
    pages: [],
    skippedFile: [],
  };

  const limiter = pLimit(10);

  await Promise.all(
    files.map(async (file) => {
      return await processFile({
        file,
        log,
        inferenceClient,
        output,
        limiter,
      });
    })
  );

  return output;
}

async function processFile({
  file: fileFullPath,
  output,
  inferenceClient,
  log,
  limiter,
}: {
  file: string;
  output: ExtractionOutput;
  inferenceClient: ScriptInferenceClient;
  log: ToolingLog;
  limiter: pLimit.Limit;
}) {
  const basename = Path.basename(fileFullPath);
  const fileContent = (await Fs.readFile(fileFullPath)).toString('utf-8');

  // TODO: esql-syntax.html
  // TODO: esql.html

  if (basename === 'esql-commands.html') {
    // process commands
    await processCommands({
      fileContent,
      log,
      output,
      limiter,
      inferenceClient,
    });
  } else if (basename === 'esql-functions-operators.html') {
    // process functions / operators
    await processFunctionsAndOperators({
      fileContent,
      log,
      output,
      limiter,
      inferenceClient,
    });
  } else if (contextArticles.includes(basename)) {
    const $element = load(fileContent)('*');
    output.pages.push({
      sourceFile: basename,
      name: basename.substring(5, basename.length - 5),
      content: getSimpleText($element),
    });
  } else {
    output.skippedFile.push(basename);
  }
}

async function processFunctionsAndOperators({
  fileContent,
  output,
  inferenceClient,
  log,
  limiter,
}: {
  fileContent: string;
  output: ExtractionOutput;
  inferenceClient: ScriptInferenceClient;
  log: ToolingLog;
  limiter: pLimit.Limit;
}) {
  const $element = load(fileContent.toString())('*');

  const sections = extractSections($element);

  const searches = [
    'Binary operators',
    'Equality',
    'Inequality',
    'Less than',
    'Less than or equal to',
    'Greater than',
    'Greater than or equal to',
    'Add +',
    'Subtract -',
    'Multiply *',
    'Divide /',
    'Modulus %',
    'Unary operators',
    'Logical operators',
    'IS NULL and IS NOT NULL',
    'Cast (::)',
  ];

  const matches = ['IN', 'LIKE', 'RLIKE'];

  const [operatorSections, allOtherSections] = partition(sections, (section) => {
    return (
      matches.includes(section.title) ||
      searches.some((search) => section.title.toLowerCase().startsWith(search.toLowerCase()))
    );
  });

  const functionSections = allOtherSections.filter(({ title }) => !!title.match(/^[A-Z_]+$/));

  const markdownFiles = await Promise.all(
    functionSections.map(async (section) => {
      return limiter(async () => {
        return {
          name: section.title,
          markdownContent: await convertToMarkdown({
            htmlContent: section.content,
            client: inferenceClient,
          }),
        };
      });
    })
  );

  output.functions.push(...markdownFiles);

  output.pages.push({
    sourceFile: 'esql-functions-operators.html',
    name: 'operators',
    content: operatorSections.map(({ title, content }) => `${title}\n${content}`).join('\n'),
  });
}

async function processCommands({
  fileContent,
  output,
  inferenceClient,
  log,
  limiter,
}: {
  fileContent: string;
  output: ExtractionOutput;
  inferenceClient: ScriptInferenceClient;
  log: ToolingLog;
  limiter: pLimit.Limit;
}) {
  const $element = load(fileContent.toString())('*');

  const sections = extractSections($element).filter(({ title }) => !!title.match(/^[A-Z_]+$/));

  const markdownFiles = await Promise.all(
    sections.map(async (section) => {
      return limiter(async () => {
        return {
          name: section.title,
          markdownContent: await convertToMarkdown({
            htmlContent: section.content,
            client: inferenceClient,
          }),
        };
      });
    })
  );

  output.commands.push(...markdownFiles);
}

export async function extractDocEntriesOld({
  file,
  log,
}: {
  file: string;
  log: ToolingLog;
}): Promise<ExtractedDocEntry[]> {
  const fileContents = await Fs.readFile(file);
  const $element = load(fileContents.toString())('*');

  // TODO: remove
  if (Path.basename(file) !== 'esql-commands.html') {
    return [];
  }

  switch (Path.basename(file)) {
    case 'esql-syntax.html':
      return [
        {
          title: 'Syntax',
          content: getSimpleText($element),
          instructions: `Generate a description of Elastic ES|QL syntax. Make sure to reuse as much as possible the provided content of file and be as complete as possible.
                    For timespan literals, generate at least five examples of full ES|QL queries, using a mix commands and functions, using different intervals and units.
                    **Make sure you use timespan literals, such as \`1 day\` or \`24h\` or \`7 weeks\` in these examples**.
                    Combine ISO timestamps with time span literals and NOW().
                    Make sure the example queries are using different combinations of syntax, commands and functions for each, and use BUCKET at least twice
                    When using DATE_TRUNC, make sure you DO NOT wrap the timespan in single or double quotes.
                    Do not use the Cast operator. In your examples, make sure to only use commands and functions that exist in the provided documentation.
                    `,
        },
      ];

    case 'esql.html':
      return [
        {
          title: 'Overview',
          content: getSimpleText($element).replace(
            /The ES\|QL documentation is organized in these sections(.*)$/,
            ''
          ),
          instructions: `Generate a description of ES|QL as a language. Ignore links to other documents. From Limitations, include the known limitations, but ignore limitations that are specific to a command.
                      Include a summary of what is mentioned in the CROSS_CLUSTER, Kibana and API sections. Explain how to use the REST API with an example and mention important information for Kibana usage and cross cluster querying.`,
        },
      ];

    default:
      log.debug('Dropping file', file);
      return [];
  }
}

function getSimpleText($element: Cheerio<AnyNode>) {
  $element.remove('.navfooter');
  $element.remove('#sticky_content');
  $element.remove('.edit_me');
  $element.find('code').each(function () {
    $(this).replaceWith('`' + $(this).text() + '`');
  });
  return $element
    .find('.section,section,.part')
    .last()
    .text()
    .replaceAll(/([\n]\s*){2,}/g, '\n');
}

export function extractSections(cheerio: Cheerio<AnyNode>) {
  const sections: Array<{
    title: string;
    content: string;
  }> = [];
  cheerio.find('.section .position-relative').each((index, element) => {
    const untilNextHeader = $(element).nextUntil('.position-relative');

    const title = $(element).text().trim().replace('edit', '');

    untilNextHeader.find('svg defs').remove();
    untilNextHeader.find('.console_code_copy').remove();
    untilNextHeader.find('.imageblock').remove();

    const htmlContent = untilNextHeader
      .map((i, node) => $(node).prop('outerHTML'))
      .toArray()
      .join('');

    sections.push({
      title: title === 'STATS ... BY' ? 'STATS' : title,
      content: `<div><h1>${title}</h1> ${htmlContent}</div>`,
    });
  });

  return sections;
}
