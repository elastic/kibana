/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { ChatForm, SummarizationModelName } from '../../types';
import { Prompt } from '../../../common/prompt';

interface ViewCodeFlyoutProps {
  onClose: () => void;
}

const LANGCHAIN_PYTHON = (formValues: ChatForm) => (
  <EuiCodeBlock language="py" isCopyable>
    {`from langchain_elasticsearch import ElasticsearchRetriever
from langchain_openai import ChatOpenAI
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

def build_query(query: str) -> dict:
    return ${JSON.stringify(formValues.elasticsearch_query.query, null, 2)}

retriever = ElasticsearchRetriever.from_es_params(
    index_name="index_name",
    body_func=build_query,
    content_field="text",
    cloud_id=cloud_id,
    api_key=api_key
)

model = ChatOpenAI(openai_api_key=OPENAI_API_KEY, model_name="${
      formValues.summarization_model ?? SummarizationModelName.gpt3_5_turbo_1106
    }")

ANSWER_PROMPT = ChatPromptTemplate.from_template(
    """${Prompt(formValues.prompt, {
      context: true,
      citations: formValues.citations,
      type: 'openai',
    })}"""
)

def _combine_documents(
    docs, document_prompt=DOCUMENT_PROMPT, document_separator="\\n\\n"
):
    doc_strings = [format_document(doc, document_prompt) for doc in docs]
    return document_separator.join(doc_strings)


_context = {
    "context": retriever | _combine_documents,
    "question": RunnablePassthrough(),
}

chain = _context | ANSWER_PROMPT | llm | StrOutputParser()

ans = chain.invoke("what is the nasa sales team?")

print("---- Answer ----")
print(ans)`}
  </EuiCodeBlock>
);

const PY_LANG_CLIENT = (formValues: ChatForm) => (
  <EuiCodeBlock language="py" isCopyable overflowHeight="100%">
    {`# pip install elasticsearch openai
import os
from elasticsearch import Elasticsearch
import openai

es = Elasticsearch(
   "http://localhost:9200"
)

openai.api_key = os.environ["OPENAI_API_KEY"]
model_name = "${formValues.summarization_model ?? SummarizationModelName.gpt3_5_turbo_1106}"

def get_elasticsearch_results(query):
    es_query = ${JSON.stringify(formValues.elasticsearch_query.query, null, 2)}

    result = es.search(index="${formValues.indices.join(',')}", query=es_query, size=${
      formValues.size || 3
    })
    return result["hits"]["hits"]

def create_openai_prompt(question, results):

  context = ""
  index_source_fields = ${JSON.stringify(formValues.source_fields, null, 2)}
  for hit in results:
    source_field = index_source_fields.get(hit["_index"])[0]
    context += "{hit["_source"][source_field]}\\n"

  prompt = """${Prompt(formValues.prompt, {
    context: true,
    citations: formValues.citations,
    type: 'openai',
  })}""".format(question=question, context=context)

  return prompt

def generate_openai_completion(user_prompt):
    response = openai.ChatCompletion.create(
        model="${formValues.summarization_model ?? SummarizationModelName.gpt3_5_turbo_1106}",
        messages=[
            {"role": "system", "content": "${formValues.prompt}"},
            {"role": "user", "content": user_prompt},
        ]
    )

    return response["choices"][0]["message"]["content"]

if __name__ == "__main__":
    question = "my query"

    elasticsearch_results = get_elasticsearch_results(question)

    context_prompt = create_openai_prompt(question, elasticsearch_results)

    openai_completion = generate_openai_completion(context_prompt)

    print(openai_completion)

`}
  </EuiCodeBlock>
);

export const ViewCodeFlyout: React.FC<ViewCodeFlyoutProps> = ({ onClose }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('py-es-client');
  const { getValues } = useFormContext<ChatForm>();
  const formValues = getValues();

  const steps = {
    'lc-py': LANGCHAIN_PYTHON(formValues),
    'py-es-client': PY_LANG_CLIENT(formValues),
  };

  return (
    <EuiFlyout ownFocus onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.searchPlayground.viewCode.flyout.title"
              defaultMessage="View Code"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.searchPlayground.viewCode.flyout.subtitle"
              defaultMessage="Copy the code into your app to use this. Modify the code as needed to fit your use case."
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiSelect
              options={[
                { value: 'py-es-client', text: 'Python Elasticsearch Client' },
                { value: 'lc-py', text: 'LangChain Python' },
              ]}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              value={selectedLanguage}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{steps[selectedLanguage]}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
