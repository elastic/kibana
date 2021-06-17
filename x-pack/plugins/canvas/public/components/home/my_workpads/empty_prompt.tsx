/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiEmptyPrompt, EuiLink, EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { ComponentStrings } from '../../../../i18n';

const { WorkpadUploadPrompt: strings } = ComponentStrings;

export const HomeEmptyPrompt = () => (
  <EuiFlexGroup justifyContent="spaceAround" alignItems="center" style={{ minHeight: 600 }}>
    <EuiFlexItem grow={false}>
      <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
        <EuiEmptyPrompt
          color="subdued"
          iconType="importAction"
          title={<h2>{strings.getEmptyPromptTitle()}</h2>}
          titleSize="m"
          body={
            <Fragment>
              <p>{strings.getEmptyPromptGettingStartedDescription()}</p>
              <p>
                {strings.getEmptyPromptNewUserDescription()}{' '}
                <EuiLink href="home#/tutorial_directory/sampleData">
                  {strings.getSampleDataLinkLabel()}
                </EuiLink>
                .
              </p>
            </Fragment>
          }
        />
      </EuiPanel>
    </EuiFlexItem>
  </EuiFlexGroup>
);
