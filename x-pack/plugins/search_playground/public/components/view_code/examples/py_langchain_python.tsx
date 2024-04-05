/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock } from '@elastic/eui';
import React from 'react';
import { ChatForm } from '../../../types';
import { Prompt } from '../../../../common/prompt';

const getESQuery = (query: any) => {
  try {
    return JSON.stringify(query, null, 2).replace('"${query}"', 'f"${query}"');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error parsing ES query', e);
    return '{}';
  }
};

export const LANGCHAIN_PYTHON = (formValues: ChatForm, clientDetails: string) => (
  <EuiCodeBlock language="py" isCopyable overflowHeight="100%">
    {`## Install the required packages
## pip install -qU elasticsearch langchain langchain-elasticsearch langchain-openai

from langchain_elasticsearch import ElasticsearchRetriever
from langchain_openai import ChatOpenAI
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import format_document
from langchain.prompts.prompt import PromptTemplate
import os

${clientDetails}

def build_query(query):
  return ${getESQuery(formValues.elasticsearch_query)}

retriever = ElasticsearchRetriever(
  index_name="{formValues.indices.join(',')}",
  body_func=build_query,
  content_field="text",
  es_client=es_client
)

model = ChatOpenAI(openai_api_key=os.environ["OPENAI_API_KEY"], model_name="${
      formValues.summarization_model
    }")


ANSWER_PROMPT = ChatPromptTemplate.from_template(
    f"""${Prompt(formValues.prompt, {
      context: true,
      citations: formValues.citations,
      type: 'openai',
    })}"""
)

DEFAULT_DOCUMENT_PROMPT = PromptTemplate.from_template(template="{page_content}")

def _combine_documents(
  docs, document_prompt=DEFAULT_DOCUMENT_PROMPT, document_separator="\\n\\n"
):
  doc_strings = [format_document(doc, document_prompt) for doc in docs]
  return document_separator.join(doc_strings)

_context = {
  "context": retriever | _combine_documents,
  "question": RunnablePassthrough(),
}

chain = _context | ANSWER_PROMPT | model | StrOutputParser()
ans = chain.invoke("what is the nasa sales team?")
print("---- Answer ----")
print(ans)`}
  </EuiCodeBlock>
);
