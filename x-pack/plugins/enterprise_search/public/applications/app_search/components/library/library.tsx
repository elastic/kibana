/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiSpacer,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiPageContentBody,
  EuiPageContent,
} from '@elastic/eui';
import React from 'react';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { Result } from '../result/result';

export const Library: React.FC = () => {
  const props = {
    result: {
      id: {
        raw: '1',
      },
      title: {
        raw: 'A title',
      },
      description: {
        raw: 'A description',
      },
      states: {
        raw: ['Pennsylvania', 'Ohio'],
      },
      visitors: {
        raw: 1000,
      },
      size: {
        raw: 200,
      },
      length: {
        raw: 100,
      },
      _meta: {},
    },
  };

  return (
    <>
      <SetPageChrome trail={['Library']} />
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Library</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentBody>
          <EuiTitle size="m">
            <h2>Result</h2>
          </EuiTitle>
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>5 or more fields</h3>
          </EuiTitle>
          <EuiSpacer />
          <Result {...props} />
          <EuiSpacer />

          <EuiTitle size="s">
            <h3>5 or less fields</h3>
          </EuiTitle>
          <EuiSpacer />
          <Result
            {...{
              result: {
                id: props.result.id,
                _meta: props.result._meta,
                title: props.result.title,
                description: props.result.description,
              },
            }}
          />
          <EuiSpacer />
        </EuiPageContentBody>
      </EuiPageContent>
    </>
  );
};
