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
import { getESQuery } from './utils';

export const PY_LANG_CLIENT = (formValues: ChatForm, clientDetails: string) => (
  <EuiCodeBlock language="py" isCopyable overflowHeight="100%">
    {`## Install the required packages
## pip install -qU elasticsearch openai

import os
from elasticsearch import Elasticsearch
from openai import OpenAI

${clientDetails}

openai_client = OpenAI(
  api_key=os.environ["OPENAI_API_KEY"],
)

index_source_fields = ${JSON.stringify(formValues.source_fields, null, 2)}

def get_elasticsearch_results(query):
  es_query = ${getESQuery({
    ...formValues.elasticsearch_query,
    size: formValues.doc_size,
  })}

  result = es.search(index="${formValues.indices.join(',')}", body=es_query)
  return result["hits"]["hits"]

def create_openai_prompt(question, results):
  context = ""
  for hit in results:
    source_field = index_source_fields.get(hit["_index"])[0]
    hit_context = hit["_source"][source_field]
    context += f"{hit_context}\\n"

  prompt = f"""${Prompt(formValues.prompt, {
    context: true,
    citations: formValues.citations,
    type: 'openai',
  })}"""

  return prompt

def generate_openai_completion(user_prompt):
  response = openai_client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[
      {"role": "system", "content": "You are an assistant for question-answering tasks."},
      {"role": "user", "content": user_prompt},
    ]
  )

  return response.choices[0].message.content

if __name__ == "__main__":
  question = "my question"
  elasticsearch_results = get_elasticsearch_results(question)
  context_prompt = create_openai_prompt(question, elasticsearch_results)
  openai_completion = generate_openai_completion(context_prompt)
  print(openai_completion)

`}
  </EuiCodeBlock>
);
