/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessageLike } from '@langchain/core/messages';
import { ToolContentResult } from '@kbn/wci-server';
import { stepDoneToolName } from './workflow_tools';

const baseSystemMessage = `
    ## Base Instructions

    You are an AI assistant tasked with retrieving and summarizing content relevant to a user query.
    Your role is to plan the retrieval by mapping query elements to the appropriate search tools,
    then executing those plans in subsequent phases.

    ### Workflow Overview

    1. **Planning:** Decide which retrieval tools to use and how to parameterize them.
    2. **Retrieval:** Execute tool calls based on your plan.
    3. **Relevance Analysis:** Evaluate and score the documents retrieved.
    4. **Content Extraction:** Extract relevant content from the most relevant documents.
    5. **Response:** Return the summary with proper document citations.

    **Note:** In the planning phase, do not execute any tool calls. Focus entirely on outlining the tool calls and the corresponding parameters to be used.`;

export const getPlanningPrompt = ({ query }: { query: string }): BaseMessageLike[] => {
  return [
    [
      'system',
      `${baseSystemMessage}

      ## Current task: Planning

      Your task is to develop a detailed plan for retrieving the content needed to answer the query.

      **Instructions:**
      - Analyze the given query to extract key identifiers or tokens.
      - Identify only retrieval/search tools from the tools available.
      - Outline your planned tool calls with clear parameter mappings.
      - If the query is ambiguous or could use multiple tools, list alternative or complementary tool calls.
      - Do not call any tool; only plan the usage.

      ### Additional information

      - Ensure the plan logically justifies the selection of each tool.

      ## Input

      The search query will be provided in the next message

      ## Example

      **Given Context:**

      - User query: "Issue 97"
      - Available tools:
          - { name: 'search_GH_foo', description: 'search GitHub issues' }
          - { name: 'search_SF_bar', description: 'search Salesforce tickets' }
          - { name: 'search_financial_docs', description: 'search for financial documents' }
          - { name: 'create_SF_issue', description: 'create a Salesforce issue' }

      **Expected Planning Output:**

      - The query "Issue 97" suggests looking for an issue with identifier "97".
      - Identify that only retrieval tools should be used.
      - Planned tool calls:
        - Call \`search_GH_foo\` with parameters \`{ id: "97" }\`
        - Call \`search_SF_bar\` with parameters \`{ issueNumber: "97" }\`

      *Remember: Do not include tools meant for content creation or other non-retrieval tasks.*
  `,
    ],
    [
      'human',
      `
    ## Input

    The search query is: "${query}"
    `,
    ],
  ];
};

export const getRetrievalPrompt = ({
  plan,
  messages,
}: {
  plan: string;
  messages: BaseMessageLike[];
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `${baseSystemMessage}

      ## Current task: Retrieval

      Your task for this phase is to execute the tool calls as defined in the plan from the previous step.
      Use the plan to call the appropriate search tools with the specified parameters to retrieve the necessary documents.

      **Key Instructions:**
      - **Follow the Plan:** Execute the tool calls exactly as detailed in the plan.
      - **Parallel Execution:** If possible, call search tools in parallel to optimize speed. If parallel calls are not supported, call them sequentially.
      - **Tool Usage:** Only call retrieval/search tools. Do not include non-retrieval tools.
      - **Step Completion:** Once you have executed all necessary search tool calls, call the \`${stepDoneToolName}\` tool as the only tool in your final message to signal that you are done with the retrieval phase.
      - **At Least One Call:** Ensure that you call at least one search tool unless the plan dictates that no further searches are necessary.

      **Additional Information:**
      - Use the parameters as specified in the plan.
      - The retrieval phase is solely for executing the plan. Do not perform relevance analysis or summarization here.
      - If any tool returns unexpected results, they can be handled in later phases.

      ## Input

      The following input includes:
      1. The plan from the previous step.
      2. The history of previous tool calls and their results (if any).
  `,
    ],
    [
      'human',
      `
    ## Input

    The plan that was defined in the previous step is:

    """
    ${plan}
    """

    Below is the history of previous search results and tool calls:
    `,
    ],
    ...messages,
  ];
};

export const getAnalysisPrompt = ({
  query,
  results,
}: {
  query: string;
  results: ToolContentResult[];
}): BaseMessageLike[] => {
  const resultEntry = (result: ToolContentResult, index: number): string => {
    return `
    ### Document (ID: ${index})

    **Document ID:** "${index}"

    **Content:**
    \`\`\`
    ${JSON.stringify(result.content, null, 2)}
    \`\`\`
    `;
  };

  return [
    [
      'system',
      `${baseSystemMessage}

      ## Current task: Relevance Analysis

      Your task is to evaluate each document retrieved during the previous phase in relation to the user’s query,
      and assign a relevance rating from 0 to 10 using the following criteria:
      - **0:** The document is completely irrelevant.
      - **5:** The document is somewhat related and might be useful.
      - **8:** The document is very relevant and contains useful information.
      - **10:** The document is absolutely crucial for answering the query.

      **Instructions:**
      - **Independent Ratings:** Rate each document independently based solely on its relevance to the provided query.
      - **Format:** Return your ratings as a JSON object with a "ratings" array, where each element follows the \`"{id}|{grade}"\` format. Example: \`{"ratings": ["0|7", "1|5", "2|10"]}\`.
      - **Document IDs:** Use the document IDs provided in this prompt, not any IDs contained in the document content.
      - **Optional Comments:** You may include an optional \`"comment"\` field with additional remarks on your ratings.

      ## Input

      ## Input

      You will receive:
      1. The search query from the user.
      2. A list of documents, each with an assigned document ID, that were retrieved in the previous step.
  `,
    ],
    [
      'human',
      `
    ## Input

    **Search Query:**: "${query}"

    ## Documents

    ${results.map(resultEntry).join('\n')}
    `,
    ],
  ];
};

export const getSummarizerPrompt = ({
  query,
  context,
  results,
}: {
  query: string;
  context: string;
  results: ToolContentResult[];
}): BaseMessageLike[] => {
  const resultEntry = (result: ToolContentResult, index: number): string => {
    return `
    ### Document ${index}

    \`\`\`
    ${JSON.stringify(result.content, null, 2)}
    \`\`\`
    `;
  };

  return [
    [
      'system',
      `${baseSystemMessage}

      ## Current task: Content Extraction

      Your task is to extract all parts of the provided documents that are directly relevant to answering the user's search query.
      You must:
      - **Extract only relevant content:** Include every piece of information that could help answer the query.
      - **Avoid extraneous commentary:** Do not add explanations, conclusions, or commentary beyond the extraction.
      - **Be concise and efficient:** Optimize your response for brevity and token usage.
      - **Direct Output:** Your final output must consist solely of the extracted content, with no additional framing or summary remarks.

      ## Input

      In the next message, you will receive the search query, any additional context, and a list of documents.
      Please extract from these documents the relevant content only.
  `,
    ],
    [
      'human',
      `
    ## Input

    **Search Query:** "${query}"

    **Additional Context:**
    """
    ${context ?? 'N/A'}
    """

    ## Documents

    ${results.map(resultEntry).join('\n\n')}
    `,
    ],
  ];
};
