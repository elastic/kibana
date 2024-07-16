/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ChatPromptTemplate } from '@langchain/core/prompts';

export const RELATED_MAIN_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant on Elasticsearch Ingest Pipelines, focusing on providing append processors that can be used to enrich samples with all relevant related.ip, related.hash, related.user and related.host fields.
  Here are some context for you to reference for your task, read it carefully as you will get questions about it later:
  <context>
  <ecs>
  {ecs}
  </ecs>
  </context>`,
  ],
  [
    'human',
    `Please help me by providing all relevant append processors for any detected related.ip, related.hash, related.user and related.host fields that would fit the below pipeline results as an array of JSON objects.
  
  <pipeline_results>
  {pipeline_results}
  </pipeline_results>
  
  Go through each of the pipeline results above step by step and do the following to add all relevant related.ip, related.hash, related.user and related.host fields.
  1. Try to understand what is unique about each pipeline result, and what sort of related.ip, related.hash, related.user and related.host fields that fit best, and if there is any unique values for each result.
  2. For each of related.ip, related.hash, related.user and related.host fields that you find, add a new append processor to your array of JSON objects.
  3. If only certain results are relevant to the related.ip, related.hash, related.user and related.host fields, add an if condition similar to the above example processors, that describes what value or field needs to be available for this categorization to take place. The if condition should be inside the processor object.
  4. Always check if the related.ip, related.hash, related.user and related.host fields are common in the ecs context above.
  5. The value argument for the append processor shall consist of one field.
  
  You ALWAYS follow these guidelines when writing your response:
  <guidelines>
  - You can add as many append processors you need to cover all the fields that you detected.
  - If conditions should always use a ? character when accessing nested fields, in case the field might not always be available, see example processors above.
  - When an if condition is not needed the argument should not be used for the processor object.
  - Do not respond with anything except the array of processors as a valid JSON objects enclosed with 3 backticks (\`), see example response below.
  </guidelines>
  
  Example response format:
  <example>
  A: Please find the Related processors below:
  \`\`\`json
  {ex_answer}
  \`\`\`
  </example>`,
  ],
  ['ai', 'Please find the Related processors below:'],
]);

export const RELATED_ERROR_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant on Elasticsearch Ingest Pipelines, focusing on resolving errors and issues with append processors used for related field categorization.
  Here is some context that you can reference for your task, read it carefully as you will get questions about it later:
  <context>
  <current_processors>
  {current_processors}
  </current_processors>
  <errors>
  {errors}
  </errors>
  </context>`,
  ],
  [
    'human',
    `Please go through each error above, carefully review the provided current processors, and resolve the most likely cause to the supplied error by returning an updated version of the current_processors.
  
  Follow these steps to help resolve the current ingest pipeline issues:
  1. Try to fix all related errors before responding.
  2. Apply all fixes to the provided array of current append processors.
  3. If you do not know how to fix an error, then continue to the next and return the complete updated array of current append processors.
  
  You ALWAYS follow these guidelines when writing your response:
  <guidelines>
  - When checking for the existance of multiple values in a single variable, use this format: "if": "['value1', 'value2'].contains(ctx.{package_name}?.{data_stream_name}?.field)"
  - If conditions should never be in a format like "if": "true". If it exist in the current array of append processors, remove only the redundant if condition.
  - If the error complains that it is a null point exception, always ensure the if conditions uses a ? when accessing nested fields. For example ctx.field1?.nestedfield1?.nestedfield2.
  - Never use "split" in template values, only use the field name inside the triple brackets. If the error mentions "Improperly closed variable in query-template" then check each "value" field for any special characters and remove them.
  - Do not respond with anything except the complete updated array of processors as a valid JSON object enclosed with 3 backticks (\`), see example response below.
  </guidelines>
  
  Example response format:
  <example>
  A: Please find the updated ECS related append processors below:
  \`\`\`json
  {ex_answer}
  \`\`\`
  </example>`,
  ],
  ['ai', 'Please find the updated ECS related append processors below:'],
]);

export const RELATED_REVIEW_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant on Elasticsearch Ingest Pipelines, focusing on adding improvements to the provided array of processors and reviewing the current results.
  
  Here is some context that you can reference for your task, read it carefully as you will get questions about it later:
  <context>
  <current_processors>
  {current_processors}
  </current_processors>
  </context>`,
  ],
  [
    'human',
    `Testing my current pipeline returned me with the below pipeline results:
  <pipeline_results>
  {pipeline_results}
  </pipeline_results>
  
  Please review the pipeline results and the array of current processors, ensuring to identify all the related.ip , related.user , related.hash and related.host fields that would match each pipeline result document. If any related.ip , related.user , related.hash or related.host fields is missing from any of the pipeline results, add them by updating the array of current processors and return the whole updated array of processors.
  
  For each pipeline result you review step by step, remember the below steps:
  1. Check each of the pipeline results to see if the field/value matches related.ip , related.user , related.hash or related.host. If not then try to correlate the results with the current processors and see if either a new append processor should be added to the list with a matching if condition, or if any of the if conditions should be modified as they are not matching that is in the results.
  2. If the results have related.ip , related.user , related.hash or related.host value, see if more of them could match, if so it could be added to the relevant append processor which added the initial values.
  3. Ensure that all append processors has allow_duplicates: false, as seen in the example response.
  
  You ALWAYS follow these guidelines when writing your response:
  <guidelines>
  -  You can use as many append processors as you need to add all relevant ECS categories and types combinations.
  - If conditions should always use a ? character when accessing nested fields, in case the field might not always be available, see example processors above.
  - When an if condition is not needed the argument should not be used for the processor object.
  - If not updates are needed you respond with the initially provided current processors.
  - Each append processor needs to have the allow_duplicates: false argument, as shown in the below example response.
  - Do not respond with anything except updated array of processors as a valid JSON object enclosed with 3 backticks (\`), see example response below.
  </guidelines>
  
  Example response format:
  <example>
  A: Please find the updated ECS related append processors below:
  \`\`\`
  {ex_answer}
  \`\`\`
  </example>`,
  ],
  ['ai', 'Please find the updated ECS related append processors below:'],
]);
