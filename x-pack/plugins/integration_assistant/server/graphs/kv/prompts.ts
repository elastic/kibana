/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ChatPromptTemplate } from '@langchain/core/prompts';

export const KV_MAIN_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert in creating Elasticsearch KV processors.Here is some context for you to reference for your task, read it carefully as you will get questions about it later:

 <context>
 <samples>
 {samples}
 </samples>
 </context>`,
  ],
  [
    'human',
    `Looking at the multiple log samples provided in the context, the logs contain key-value (KV) pairs that we want to extract and index for easier search and analysis. Our goal is to write a KV processor for Elasticsearch's ingest node, which will parse these KV pairs and make them available as structured fields in our Elasticsearch index.

 Follow these steps to help improve the KV processor and apply it to each field step by step:

 1. Based on your analysis of the log samples, create a KV processor that can parse log. The processor should correctly handle logs where keys and values are separated by a \`field_split\` and pairs are separated by \`value_split\`.
 2. Recognize and properly format different data types such as strings, numbers, and timestamps.
 3. Handle quoted values correctly (e.g., error="Insufficient funds").
 4. The \`value_split\` is Regex pattern to use for splitting the key from the value within a key-value pair (e.g., ':' , '=' )
 5. The \`field_split\` is the Regex pattern to use for splitting key-value pairs in the log (e.g., ';'  , '|' )
 6. Do not use whitespace character in regex for \`field_split\` or \`value_split\`. Instead use the \`trim_key\` and \`trim_value\` fields.
 7. Use \`trim_key\` for string of characters to trim from extracted keys.
 8. Use \`trim_value\` for string of characters to trim from extracted values.

 You ALWAYS follow these guidelines when writing your response:
 <guidelines>
 - Use only elasticsearch kv processor.
 - Do not create any other processors.
 - Do not add any prefix to the processor.
 - Do not use the special character \`\s\` in the \`field_split\` or \`value_split\` regular expressions.
 - Do not add brackets (), <>, [] as well as quotes ' and " to \`trim_value\`.
 - Make sure to trim whitespaces in \`trim_key\`. 
 - Do not respond with anything except the processor as a JSON object enclosed with 3 backticks (\`), see example response below. Use strict JSON response format.
 </guidelines>

 Example response format:

 <example_response>
 A: Please find the JSON object below:
 \`\`\`json
{ex_answer}
 \`\`\`
 </example_response>`,
  ],
  ['ai', 'Please find the KV processor below:'],
]);
