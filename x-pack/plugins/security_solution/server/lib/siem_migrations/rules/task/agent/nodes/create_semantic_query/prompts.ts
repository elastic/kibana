/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
export const CREATE_SEMANTIC_QUERY_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful assistant that helps in translating provided titles, descriptions and data sources into a single summary of keywords specifically crafted to be used as a semantic search query, which are usually short and includes keywords that are valid for the usecase.
The data provided are collected from SIEM detection rules, and it is trying to match the description of a list of data sources, so provide good keywords that match this usecase.
Try to also detect what sort of vendor, solution or technology is required and add these as keywords as well.
Some examples would be to identify if its cloud, which vendor, network, host, endpoint, etc.`,
  ],
  [
    'human',
    `<query>
Title: {title}
Description: {description}
Query: {query}
</query>

Go through the relevant title, description and data sources from the above query and create a collection of keywords specifically crafted to be used as a semantic search query.

<guidelines>
- The query should be short and concise.
- Include keywords that are relevant to the use case.
- Add related keywords you detected from the above query, like one or more vendor, product, cloud provider, OS platform etc.
- Always reply with a JSON object with the key "semantic_query" and the value as the semantic search query inside three backticks as shown in the below example.
</guidelines>

<example_response>
U: <query>
Title: Processes created by netsh
Description: This search looks for processes launching netsh.exe to execute various commands via the netsh command-line utility. Netsh.exe is a command-line scripting utility that allows you to, either locally or remotely, display or modify the network configuration of a computer that is currently running. Netsh can be used as a persistence proxy technique to execute a helper .dll when netsh.exe is executed. In this search, we are looking for processes spawned by netsh.exe that are executing commands via the command line. Deprecated because we have another detection of the same type.
Data Sources:
</query>
A: Please find the semantic_query keywords JSON object below:
\`\`\`json
{{"semantic_query": "windows host endpoint netsh.exe process creation command-line utility network configuration persistence proxy dll execution sysmon event id 1"}}
\`\`\`
</example_response>`,
  ],
  ['ai', 'Please find the semantic_query keywords JSON object below:'],
]);
