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
    ## Base instructions

    You are an helpful AI assistant specialized in retrieving content and summarizing them.

    You will receive a natural language query from the user. Based on that query and using the tools
    at your disposal, you will execute tasks to retrieve the most relevant documents and

    ### Workflow

    To fulfill your goal, you will go through a well defined workflow composed of multiple steps:

    1. planning - You will plan which tools you should call and how. Use that step to brainstorm about the execution of the next step
    2. retrieval - You will call the tools according to what was planned in the previous step
    3. relevance analysis - You will analyze the documents retrieved in the previous step, to score them depending on their relevance.
    4. summarization - You will generate a summary of the most relevant documents that could be used to answer the natural language query from the user
    5. response - The summary from step 4 will be returned to the user, with references to the cited documents
    `;

export const getPlanningPrompt = ({ query }: { query: string }): BaseMessageLike[] => {
  return [
    [
      'system',
      `${baseSystemMessage}

      ## Current task

      Your current task is the first task of the workflow - planning

      Based on the query from the user, and the tools at your disposal, write down a plan of which tools you
      think you should be calling, with which parameters

      ### Additional information

      - Only list tools that can be used to retrieve or search for content. Refer to each tool's description.
      - Don't call any tool, your current task is to plan how to call them later

      ## Input

      The search query will be provided in the next message

      ## Example

      ### Example 1

      Given this context:

      '''
      - search query from the user: "Issue 97"

      - tools at your disposal:
          - { name: 'search_GH_foo', description: 'use this tool to search for github issues in the foo repository' }
          - { name: 'search_SF_bar', description: 'use this tool to search for salesforce tickets' }
          - { name: 'search_financial_docs', description: 'use this tool to search for financial documents about the org' }
          - { name: 'create_SF_issue', description: 'use this tool to create a salesforce issue' }
      '''

      The expected output from the planning phase would be:

      '''
      I need to search for an issue with ID matching 97.
      I have 3 search tools at my disposal:
      - one to search for GH issues
      - one to search for salesforce tickets
      - one to search for human resource documents

      I'm looking for an issue, so I'm going to call the 'search_GH_foo' and the 'search_SF_bar' tools.
      - I will call search_GH_foo with parameters { id: '97' }
      - I will call search_GH_foo with parameters { id: '97' }
      '''

      *Important*: these are only examples, please reason on the tools that you really have at your disposal, not the
      ones from the examples
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

      ## Current task

      Your current task is the second task of the workflow - retrieval

      Based on the plan that was defined in the previous step, please call the tools accordingly to retrieve the content.

      When you are done searching, call the "${stepDoneToolName}" tool to transition to the next step.

      ### Additional information

      - Please call search tools in parallel if possible.
      - When calling the ${stepDoneToolName} tool, only call this single tool, without including any other search tool call.
      - You should always call at least one tool. Either search tools according to the plan, or the ${stepDoneToolName} tool when
        you are done.

      ## Input

      The plan from previous step will be provided in the next user message.
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

    The following messages is the history of what you already searched for and the results
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
    ### Document ID ${index}

    ${JSON.stringify(result.content)}
    `;
  };

  return [
    [
      'system',
      `${baseSystemMessage}

      ## Current task

      Your current task is the third task of the workflow - relevance analysis

      You will be provided the search query from the user and the documents that were retrieved during the previous step.

      Based on this, please rate each document from 0 to 10,
      - 0 being a document totally irrelevant or out of context to the search query
      - 5 being a document that could be useful to answer the user query, or somewhat related to it
      - 8 being a document containing very relevant or useful information to answer the query
      - 10 being a document containing info absolutely mandatory to answer the question

      ### Additional information

      - Please each document independently to each other

      ## Input

      The search query from the user, and the documents, will be provided in the next user message
  `,
    ],
    [
      'human',
      `
    ## Input

    The search query is: "${query}"

    """
    ${query}
    """

    ## Documents

    ${results.map(resultEntry).join('\n\n')}
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
    ### Document

    ${JSON.stringify(result.content)}
    `;
  };

  return [
    [
      'system',
      `${baseSystemMessage}

      ## Current task

      Your current task is the fourth task of the workflow - relevant content extraction

      You will be provided the search query from the user and the documents that were selected as relevant to the query.

      Based on this, please extract the parts of the content and information of the documents that is relevant to answer the query.

      ### Additional information

      - N/A

      ## Input

      The search query from the user, and the documents, will be provided in the next user message
  `,
    ],
    [
      'human',
      `
    ## Input

    The search query is: "${query}"

    """
    ${query}
    """

    ## Documents

    ${results.map(resultEntry).join('\n\n')}
    `,
    ],
  ];
};
