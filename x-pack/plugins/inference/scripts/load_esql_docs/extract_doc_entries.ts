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
import { convertToMarkdownPrompt } from './prompts/convert_to_markdown';
import { bindOutput, PromptCaller } from './utils/output_executor';

/**
 * The pages that will be extracted but only used as context
 * for the LLM for the enhancement tasks of the documentation entries.
 */
const contextArticles = [
  'esql.html',
  'esql-syntax.html',
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
  command: boolean;
}

export interface ExtractionOutput {
  commands: ExtractedCommandOrFunc[];
  functions: ExtractedCommandOrFunc[];
  pages: ExtractedPage[];
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

  const executePrompt = bindOutput({
    output: inferenceClient.output,
    connectorId: inferenceClient.getConnectorId(),
  });

  const limiter = pLimit(10);

  await Promise.all(
    files.map(async (file) => {
      return await processFile({
        file,
        log,
        executePrompt,
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
  executePrompt,
  log,
  limiter,
}: {
  file: string;
  output: ExtractionOutput;
  executePrompt: PromptCaller;
  log: ToolingLog;
  limiter: pLimit.Limit;
}) {
  const basename = Path.basename(fileFullPath);
  const fileContent = (await Fs.readFile(fileFullPath)).toString('utf-8');

  if (basename === 'esql-commands.html') {
    // process commands
    await processCommands({
      fileContent,
      log,
      output,
      limiter,
      executePrompt,
    });
  } else if (basename === 'esql-functions-operators.html') {
    // process functions / operators
    await processFunctionsAndOperators({
      fileContent,
      log,
      output,
      limiter,
      executePrompt,
    });
  } else if (contextArticles.includes(basename)) {
    const $element = load(fileContent)('*');
    output.pages.push({
      sourceFile: basename,
      name: basename === 'esql.html' ? 'overview' : basename.substring(5, basename.length - 5),
      content: getSimpleText($element),
    });
  } else {
    output.skippedFile.push(basename);
  }
}

async function processFunctionsAndOperators({
  fileContent,
  output,
  executePrompt,
  log,
  limiter,
}: {
  fileContent: string;
  output: ExtractionOutput;
  executePrompt: PromptCaller;
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
          markdownContent: await executePrompt(
            convertToMarkdownPrompt({ htmlContent: section.content })
          ),
          command: false,
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
  executePrompt,
  log,
  limiter,
}: {
  fileContent: string;
  output: ExtractionOutput;
  executePrompt: PromptCaller;
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
          markdownContent: await executePrompt(
            convertToMarkdownPrompt({ htmlContent: section.content })
          ),
          command: true,
        };
      });
    })
  );

  output.commands.push(...markdownFiles);
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
    untilNextHeader.find('table').remove();

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
