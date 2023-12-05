/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import stringify from 'json-stable-stringify';
import {
  EuiSpacer,
  EuiPanel,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiTitle,
  EuiIconTip,
} from '@elastic/eui';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas.gen';
import { DiffView } from './json_diff/diff_view';
import * as i18n from './json_diff/translations';

const sortAndStringifyJson = (jsObject: Record<string, unknown>): string =>
  stringify(jsObject, { space: 2 });

interface RuleDiffTabProps {
  oldRule: RuleResponse;
  newRule: RuleResponse;
}

export const RuleDiffTab = ({ oldRule, newRule }: RuleDiffTabProps) => {
  const [oldSource, newSource] = useMemo(() => {
    return [sortAndStringifyJson(oldRule), sortAndStringifyJson(newRule)];
  }, [oldRule, newRule]);

  return (
    <>
      <EuiSpacer size="m" />
      <EuiPanel color="transparent" hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexGroup alignItems="baseline" gutterSize="xs">
            <EuiIconTip
              color="subdued"
              content={i18n.BASE_VERSION_DESCRIPTION}
              type="iInCircle"
              size="m"
              display="block"
            />
            <EuiTitle size="xxxs">
              <h6>{i18n.BASE_VERSION}</h6>
            </EuiTitle>
          </EuiFlexGroup>
          <EuiFlexGroup alignItems="baseline" gutterSize="xs">
            <EuiIconTip
              color="subdued"
              content={i18n.UPDATED_VERSION_DESCRIPTION}
              type="iInCircle"
              size="m"
            />
            <EuiTitle size="xxxs">
              <h6>{i18n.UPDATED_VERSION}</h6>
            </EuiTitle>
          </EuiFlexGroup>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="s" size="full" />
        <DiffView oldSource={oldSource} newSource={newSource} />
      </EuiPanel>
    </>
  );
};
