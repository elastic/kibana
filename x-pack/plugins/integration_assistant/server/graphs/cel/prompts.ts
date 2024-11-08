/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ChatPromptTemplate } from '@langchain/core/prompts';

export const CEL_QUERY_SUMMARY_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant in REST APIs and OpenAPI specifications.
Here is some context for you to reference for your task, read it carefully as you will get questions about it later:
<context>
<open_api_spec>
{open_api_spec}
</open_api_spec>
</context>`,
  ],
  [
    'human',
    `For the {data_stream_name} endpoint and provided OpenAPI specification, please describe which query parameters you would use so that all events are covered in a chronological manner.

You ALWAYS follow these guidelines when writing your response:
 <guidelines>
 - Prioritize bulk api routes over more specialized routes.
 </guidelines>

Please respond with a concise text answer, and a sample URL path.`,
  ],
  ['ai', `Please find the query summary text below:`],
]);

export const CEL_BASE_PROGRAM_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant in building Elastic filebeat input configurations utilizing the Common Expression Language (CEL) input type.
Here is some context for you to reference your task, review it carefully as you will get questions about it later:
<context>
<open_api_spec>
{open_api_spec}
</open_api_spec>
<example_cel_programs>
{example_cel_programs}
</example_cel_programs>
</context>`,
  ],
  [
    'human',
    `Please build only the program section of the CEL filebeat input configuration for the the datastream {data_stream_name} such that the program is able to iterate through and ingest pages of events into Elasticsearch.
Utilize the following paging summary details and sample URL for implementing paging when building your output.

<context>
<api_query_summary>
{api_query_summary}
</api_query_summary>
</context>

Each of the following criteria must be addressed in final configuration output:
- The REST verb must be specified.
- The request URL must include the 'state.url'.
- The request URL must include the API path.
- The request URL must include all query parameters from the paging summary using a 'format_query' function. Remember to utilize the state variables inside brackets when building the function and be sure to cast any numeric variables to string using 'string(variable)'.
- All request URL parameters must utilize state variables.
- The request URL must include a '?' at the end of API path string.
- Always use the casing specified by the API spec when building the API path and query parameters.
- There must not be configuration for authentication or authorization.
- There must be configuration of any required headers.
- There must be configuration for parsing the events returned from the API mapped to the 'message' field and encoded in JSON.
- There must be configuration in the API response handling for 'want_more' based on the paging token.
- There must be configuration for error handling. This includes setting the 'want_more' flag to false.
- All state variables must use snake casing.
- The page tokens must be updated the corresponding state variable(s).

You ALWAYS follow these guidelines when writing your response:
<guidelines>
- You must never include any code for writing data to the API.
- You must respond only with the code block containing the program formatted like human-readable C code. See example response below.
- You must use 2 spaces for tab size.
- Do not enclose the final output in backticks, only return the codeblock and nothing else.
</guidelines>

Example response:
A: Please find the CEL program below:
{ex_answer}`,
  ],
  ['ai', `Please find the CEL program below:`],
]);

export const CEL_STATE_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant in building Elastic filebeat input configurations utilizing the Common Expression Language (CEL) input type.
Here is some context for you to reference for your task, read it carefully as you will get questions about it later:

<context>
<cel_program>
{cel_program}
</cel_program>
</context>`,
  ],
  [
    'human',
    `Looking at the CEL program provided in the context, please return a string array of the state variables

You ALWAYS follow these guidelines when writing your response:

 <guidelines>
 - Respond with the array only.
 </guidelines>

 <example_response>
 A: Please find the JSON list below:
 \`\`\`
{ex_answer}
 \`\`\`
 </example_response>`,
  ],
  ['ai', `Please find the JSON list below:`],
]);

export const CEL_CONFIG_DETAILS_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful, expert assistant on OpenAPI specifications and building Elastic integrations.
Here is some context for you to reference for your task, read it carefully as you will get questions about it later:

<context>
<open_api_spec>
{open_api_spec}
</open_api_spec>
</context>`,
  ],
  [
    'human',
    `For the identified state variables {state_variables}, iterate through each variable (name) and identify a default value (default) and a boolean representing if it should be redacted(redact). Return all of this information in a JSON object like the sample below. 

You ALWAYS follow these guidelines when writing your response:

 <guidelines>
 - Page sizing default should always be non-zero. 
 - Redact anything that could possibly contain PII, tokens or keys, or expose any sensitive information in the logs.
 - You must use the variable names in parentheses when building the return object. Each item in the response must contain the fields: name, redact and default.
 - Do not respond with anything except the JSON object enclosed with 3 backticks (\`), see example response below.
 </guidelines>
Example response format:
 <example_response>
 A: Please find the JSON object below:
 \`\`\`json
{ex_answer}
 \`\`\`
 </example_response>
`,
  ],
  ['ai', `Please find the JSON object below:`],
]);
