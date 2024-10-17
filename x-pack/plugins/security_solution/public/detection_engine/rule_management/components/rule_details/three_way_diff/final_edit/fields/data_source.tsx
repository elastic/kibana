/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import { i18n as i18nCore } from '@kbn/i18n';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiButtonEmpty, EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { isEqual } from 'lodash';
import { DataSourceType } from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import { DocLink } from '../../../../../../../common/components/links_to_docs/doc_link';
import { DataViewSelector } from '../../../../../../rule_creation_ui/components/data_view_selector';
import { useUiSetting$ } from '../../../../../../../common/lib/kibana';
import { DEFAULT_INDEX_KEY } from '../../../../../../../../common/constants';
import { schema } from '../../../../../../rule_creation_ui/components/step_define_rule/schema';
import { Field, HiddenField, UseField } from '../../../../../../../shared_imports';
import type { FieldComponentProps } from '../field_component_props';
import * as i18n from './translations';

interface DataSourceEditProps extends FieldComponentProps {
  index: string;
}

export function DataSourceEdit({
  finalDiffableRule,
  index,
  setFieldValue,
  resetField,
}: DataSourceEditProps): JSX.Element | null {
  const dataSourceType: DataSourceType =
    ('data_source' in finalDiffableRule && finalDiffableRule.data_source?.type) ||
    DataSourceType.index_patterns;
  const [indicesConfig] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const [indexModified, setIndexModified] = useState(false);

  useEffect(() => {
    setIndexModified(!isEqual(index, indicesConfig));
  }, [index, indicesConfig]);

  const dataViewIndexPatternToggleButtonOptions: EuiButtonGroupOptionProps[] = useMemo(
    () => [
      {
        id: DataSourceType.index_patterns,
        label: i18nCore.translate(
          'xpack.securitySolution.ruleDefine.indexTypeSelect.indexPattern',
          {
            defaultMessage: 'Index Patterns',
          }
        ),
        iconType:
          dataSourceType === DataSourceType.index_patterns ? 'checkInCircleFilled' : 'empty',
        'data-test-subj': `rule-index-toggle-${DataSourceType.index_patterns}`,
      },
      {
        id: DataSourceType.data_view,
        label: i18nCore.translate('xpack.securitySolution.ruleDefine.indexTypeSelect.dataView', {
          defaultMessage: 'Data View',
        }),
        iconType: dataSourceType === DataSourceType.data_view ? 'checkInCircleFilled' : 'empty',
        'data-test-subj': `rule-index-toggle-${DataSourceType.data_view}`,
      },
    ],
    [dataSourceType]
  );

  const handleDataSourceChange = useCallback(
    (optionId: string) => {
      setFieldValue('dataSourceType', optionId);
      resetField('index', {
        resetValue: false,
      });
      resetField('dataViewId', {
        resetValue: false,
      });
    },
    [setFieldValue, resetField]
  );

  const handleResetIndices = useCallback(
    () => setFieldValue('index', indicesConfig),
    [setFieldValue, indicesConfig]
  );

  return useMemo(() => {
    return (
      <>
        <UseField
          path="dataSourceType"
          component={HiddenField}
          componentProps={{
            euiFieldProps: {
              fullWidth: true,
              placeholder: '',
            },
          }}
        />
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          data-test-subj="dataViewIndexPatternButtonGroupFlexGroup"
        >
          <EuiFlexItem>
            <DataSourceInfoText />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButtonGroup
              isFullWidth
              legend="Rule index pattern or data view selector"
              data-test-subj="dataViewIndexPatternButtonGroup"
              idSelected={dataSourceType}
              onChange={handleDataSourceChange}
              options={dataViewIndexPatternToggleButtonOptions}
              color="primary"
            />
          </EuiFlexItem>

          <EuiFlexItem>
            <TabContent visible={dataSourceType === DataSourceType.data_view}>
              <UseField key="DataViewSelector" path="dataViewId" component={DataViewSelector} />
            </TabContent>
            <TabContent visible={dataSourceType === DataSourceType.index_patterns}>
              <UseField
                component={Field}
                path="index"
                config={{
                  ...schema.index,
                  labelAppend: indexModified ? (
                    <EuiButtonEmpty onClick={handleResetIndices} iconType="refresh">
                      {i18n.RESET_DEFAULT_INDEX}
                    </EuiButtonEmpty>
                  ) : null,
                }}
                componentProps={{
                  idAria: 'detectionEngineStepDefineRuleIndices',
                  'data-test-subj': 'detectionEngineStepDefineRuleIndices',
                  euiFieldProps: {
                    fullWidth: true,
                    placeholder: '',
                  },
                }}
              />
            </TabContent>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }, [
    dataSourceType,
    handleDataSourceChange,
    dataViewIndexPatternToggleButtonOptions,
    indexModified,
    handleResetIndices,
  ]);
}

// function getDataSourceType(finalDiffableRule: DiffableRule): DataSourceType {
//   if (!finalDiffableRule.data_source) {
//     return DataSourceType.IndexPatterns;
//   }

//   switch (finalDiffableRule.data_source) {
//     case
//   }
// }

function DataSourceInfoText(): JSX.Element {
  return (
    <EuiText size="xs">
      <FormattedMessage
        id="xpack.securitySolution.dataViewSelectorText1"
        defaultMessage="Use Kibana "
      />
      <DocLink guidePath="kibana" docPath="data-views.html" linkText="Data Views" />
      <FormattedMessage
        id="xpack.securitySolution.dataViewSelectorText2"
        defaultMessage=" or specify individual "
      />
      <DocLink
        guidePath="kibana"
        docPath="index-patterns-api-create.html"
        linkText="index patterns"
      />
      <FormattedMessage
        id="xpack.securitySolution.dataViewSelectorText3"
        defaultMessage=" as your rule's data source to be searched."
      />
    </EuiText>
  );
}

interface TabProps {
  visible: boolean;
}

const hidden = css`
  display: none;
`;

function TabContent({ visible, children }: PropsWithChildren<TabProps>): JSX.Element {
  return <div css={!visible ? hidden : undefined}>{children}</div>;
}
