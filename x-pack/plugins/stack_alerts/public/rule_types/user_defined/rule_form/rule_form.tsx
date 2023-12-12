/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiButton,
} from '@elastic/eui';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { UserDefinedRuleParams } from '../types';
import { CodeEditorModal } from './code_editor_modal';

export const RuleForm: React.FunctionComponent<
  RuleTypeParamsExpressionProps<UserDefinedRuleParams>
> = (props) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    props.setRuleParams('stringifiedUserCode', 'console.log("your code appears here!");');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = useCallback(
    (code: string) => {
      props.setRuleParams('stringifiedUserCode', code.trim());
    },
    [props]
  );

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            isInvalid={!!(props.errors.stringifiedUserCode as string[])[0]}
            error={(props.errors.stringifiedUserCode as string[])[0]}
          >
            <EuiCodeBlock language="javascript" fontSize="m" paddingSize="m">
              {props.ruleParams.stringifiedUserCode}
            </EuiCodeBlock>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton color="primary" onClick={() => setIsModalOpen(true)}>
                Edit code
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton color="primary" disabled>
                Test run
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <CodeEditorModal
        isOpen={isModalOpen}
        code={props.ruleParams.stringifiedUserCode}
        onChange={onChange}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
