/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { pick } from 'lodash';
import { EuiTabbedContent, EuiForm } from '@elastic/eui';
import { Rule } from '../../../types';
import { DiagnoseOutput } from '../../../../../alerting/common';
import { useKibana } from '../../../common/lib/kibana';
import { diagnoseRule } from '../../lib/rule_api';
import { PartialRule } from '../../lib/rule_api/diagnose';
import { suspendedComponentWithProps } from '../../lib/suspended_component_with_props';
import { RulePreviewWarnings } from './rule_preview_warnings';
import { RulePreviewContent } from './rule_preview_content';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';

export interface RulePreviewProps {
  potentialRule?: PartialRule;
  existingRule?: Rule;
}

export const RulePreview = ({ potentialRule, existingRule }: RulePreviewProps) => {
  const { http } = useKibana().services;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [previewOutput, setPreviewOutput] = useState<DiagnoseOutput>({} as DiagnoseOutput);

  useEffect(() => {
    (async () => {
      if (potentialRule) {
        setIsLoading(true);
        setPreviewOutput(
          await diagnoseRule({
            http,
            rule: pick(potentialRule, 'ruleTypeId', 'params', 'consumer', 'schedule'),
          })
        );
        setIsLoading(false);
      }
    })();
  }, [http, potentialRule]);

  useEffect(() => {
    (async () => {
      if (existingRule) {
        setIsLoading(true);
        setPreviewOutput(await diagnoseRule({ http, rule: existingRule }));
        setIsLoading(false);
      }
    })();
  }, [http, existingRule]);

  const tabs = [
    {
      id: 'errorsAndWarning',
      name: 'Errors and Warnings',
      content: suspendedComponentWithProps(
        RulePreviewWarnings,
        'xl'
      )({ errorsAndWarnings: previewOutput?.errorsAndWarnings }),
    },
    {
      id: 'requests',
      name: 'Search Requests',
      content: suspendedComponentWithProps(
        RulePreviewContent,
        'xl'
      )({
        description: `The following search requests were made while previewing your rule:`,
        content: previewOutput?.requestAndResponses?.requests,
      }),
    },
    {
      id: 'responses',
      name: 'Search Responses',
      content: suspendedComponentWithProps(
        RulePreviewContent,
        'xl'
      )({
        description: `The following search responses were received while previewing your rule:`,
        content: previewOutput?.requestAndResponses?.responses,
      }),
    },
  ];

  return (
    <EuiForm>{isLoading ? <CenterJustifiedSpinner /> : <EuiTabbedContent tabs={tabs} />}</EuiForm>
  );
};
