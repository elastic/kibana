/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSuperSelectOption, EuiThemeComputed } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Space } from '../../../../common';
import { SectionPanel } from '../section_panel';

type SolutionView = Space['solution'];

const getOptions = ({ size }: EuiThemeComputed): Array<EuiSuperSelectOption<SolutionView>> => {
  const iconCss = { marginRight: size.m };

  return [
    {
      value: 'es',
      inputDisplay: (
        <>
          <EuiIcon type="logoElasticsearch" css={iconCss} />
          {i18n.translate(
            'xpack.spaces.management.manageSpacePage.solutionViewSelect.searchOptionLabel',
            {
              defaultMessage: 'Search',
            }
          )}
        </>
      ),
      'data-test-subj': 'solutionViewEsOption',
    },
    {
      value: 'oblt',
      inputDisplay: (
        <>
          <EuiIcon type="logoObservability" css={iconCss} />
          {i18n.translate(
            'xpack.spaces.management.manageSpacePage.solutionViewSelect.obltOptionLabel',
            {
              defaultMessage: 'Observability',
            }
          )}
        </>
      ),
      'data-test-subj': 'solutionViewObltOption',
    },
    {
      value: 'security',
      inputDisplay: (
        <>
          <EuiIcon type="logoSecurity" css={iconCss} />
          {i18n.translate(
            'xpack.spaces.management.manageSpacePage.solutionViewSelect.securityOptionLabel',
            {
              defaultMessage: 'Security',
            }
          )}
        </>
      ),
      'data-test-subj': 'solutionViewSecurityOption',
    },
    {
      value: 'classic',
      inputDisplay: (
        <>
          <EuiIcon type="logoKibana" css={iconCss} />
          {i18n.translate(
            'xpack.spaces.management.manageSpacePage.solutionViewSelect.classicOptionLabel',
            {
              defaultMessage: 'Classic',
            }
          )}
        </>
      ),
      'data-test-subj': 'solutionViewClassicOption',
    },
  ];
};

interface Props {
  space: Partial<Space>;
  onChange: (space: Partial<Space>) => void;
}

export const SolutionView: FunctionComponent<Props> = ({ space, onChange }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <SectionPanel
      title={i18n.translate('xpack.spaces.management.manageSpacePage.navigationTitle', {
        defaultMessage: 'Navigation',
      })}
      dataTestSubj="navigationPanel"
    >
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.spaces.management.manageSpacePage.setSolutionViewMessage"
                defaultMessage="Set solution view"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.spaces.management.manageSpacePage.setSolutionViewDescription"
                defaultMessage="Determines the navigation all users will see for this space. Each solution view contains features from Analytics tools and Management."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.spaces.management.navigation.solutionViewLabel', {
              defaultMessage: 'Solution view',
            })}
            fullWidth
          >
            <EuiSuperSelect
              options={getOptions(euiTheme)}
              valueOfSelected={space.solution}
              data-test-subj="solutionViewSelect"
              onChange={(solution) => {
                onChange({ ...space, solution });
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </SectionPanel>
  );
};
