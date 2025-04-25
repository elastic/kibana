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

index_source_fields = ${JSON.stringify(formValues.source_fields, null, 4)}

def get_elasticsearch_results():
    es_query = ${getESQuery({
      ...formValues.elasticsearch_query,
      size: formValues.doc_size,
    })}

    result = es_client.search(index="${formValues.indices.join(',')}", body=es_query)
    return result["hits"]["hits"]

def create_openai_prompt(results):
    context = ""
    for hit in results:
        inner_hit_path = f"{hit['_index']}.{index_source_fields.get(hit['_index'])[0]}"

        ## For semantic_text matches, we need to extract the text from the inner_hits
        if 'inner_hits' in hit and inner_hit_path in hit['inner_hits']:
            context += '\\n --- \\n'.join(inner_hit['_source']['text'] for inner_hit in hit['inner_hits'][inner_hit_path]['hits']['hits'])
        else:
            source_field = index_source_fields.get(hit["_index"])[0]
            hit_context = hit["_source"][source_field]
            context += f"{hit_context}\\n"

    prompt = f"""${Prompt(formValues.prompt, {
      context: true,
      citations: formValues.citations,
      type: 'openai',
    })}"""

    return prompt

def generate_openai_completion(user_prompt, question):
    response = openai_client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": user_prompt},
            {"role": "user", "content": question},
        ]
    )

    return response.choices[0].message.content

if __name__ == "__main__":
    question = "my question"
    elasticsearch_results = get_elasticsearch_results()
    context_prompt = create_openai_prompt(elasticsearch_results)
    openai_completion = generate_openai_completion(context_prompt, question)
    print(openai_completion)

`}
  </EuiCodeBlock>
);
