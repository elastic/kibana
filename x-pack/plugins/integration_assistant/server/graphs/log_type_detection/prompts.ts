/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ChatPromptTemplate } from '@langchain/core/prompts';
export const LOG_FORMAT_DETECTION_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant in identifying different log types based on the format.

Here is some context for you to reference for your task, read it carefully as you will get questions about it later:
<context>
<log_samples>
{log_samples}
</log_samples>
</context>`,
  ],
  [
    'human',
    `Looking at the log samples , our goal is to identify the syslog type based on the guidelines below.
<guidelines>
- Go through each log sample and identify the log format type.
- If the samples have a syslog header then set "header: true" , else set "header: false". If you are unable to determine the syslog header presence then set "header: false".
- If the syslog samples have structured body then classify it as "log_type: structured".
- If the syslog samples have unstructured body then classify it as "log_type: unstructured".
- If the syslog samples follow a csv format then classify it as "log_type: csv".
- If the samples are identified as "csv" and there is a csv header then set "header: true" , else set "header: false".
- If you do not find the log format in any of the above categories then classify it as "log_type: unsupported".
- Do not respond with anything except the updated current mapping JSON object enclosed with 3 backticks (\`). See example response below.
</guidelines>

Example response format:
<example>
A: Please find the JSON object below:
\`\`\`json
{ex_answer}
\`\`\`
</example>`,
  ],
  ['ai', 'Please find the JSON object below:'],
]);
