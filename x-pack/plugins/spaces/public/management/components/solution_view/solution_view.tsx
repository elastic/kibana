/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSuperSelectOption, EuiThemeComputed } from '@elastic/eui';
import {
  EuiBetaBadge,
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
import { SOLUTION_VIEW_CLASSIC } from '../../../../common/constants';
import type { SpaceValidator } from '../../lib';
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
            { defaultMessage: 'Elasticsearch' }
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
            { defaultMessage: 'Observability' }
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
            { defaultMessage: 'Security' }
          )}
        </>
      ),
      'data-test-subj': 'solutionViewSecurityOption',
    },
    {
      value: 'classic',
      inputDisplay: (
        <>
          <EuiIcon type="logoElasticStack" css={iconCss} />
          {i18n.translate(
            'xpack.spaces.management.manageSpacePage.solutionViewSelect.classicOptionLabel',
            { defaultMessage: 'Classic' }
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
  isEditing: boolean;
  validator: SpaceValidator;
  sectionTitle?: string;
}

export const SolutionView: FunctionComponent<Props> = ({
  space,
  onChange,
  validator,
  isEditing,
  sectionTitle,
}) => {
  const { euiTheme } = useEuiTheme();
  const showClassicDefaultViewCallout = isEditing && space.solution == null;

  return (
    <SectionPanel title={sectionTitle} dataTestSubj="navigationPanel">
      <EuiFlexGroup alignItems="flexStart">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <h3>
                  <FormattedMessage
                    id="xpack.spaces.management.manageSpacePage.setSolutionViewMessage"
                    defaultMessage="Select solution view"
                  />
                </h3>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiBetaBadge
                  label={i18n.translate(
                    'xpack.spaces.management.manageSpacePage.setSolutionViewNewBadge',
                    { defaultMessage: 'New' }
                  )}
                  color="accent"
                  size="s"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.spaces.management.manageSpacePage.setSolutionViewDescription"
                defaultMessage="Focus the navigation and menus of this space on a specific solution. Features that are not relevant to the selected solution are no longer visible to users of this space."
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
            helpText={
              <React.Fragment>
                {showClassicDefaultViewCallout ? (
                  <FormattedMessage
                    id="xpack.spaces.management.manageSpacePage.solutionViewSelect.classicDefaultViewCallout"
                    defaultMessage="Affects all users of the space"
                  />
                ) : null}
              </React.Fragment>
            }
            {...validator.validateSolutionView(space, isEditing)}
          >
            <EuiSuperSelect
              options={getOptions(euiTheme)}
              valueOfSelected={
                space.solution ??
                (showClassicDefaultViewCallout ? SOLUTION_VIEW_CLASSIC : undefined)
              }
              data-test-subj="solutionViewSelect"
              onChange={(solution) => {
                onChange({ ...space, solution });
              }}
              placeholder={i18n.translate(
                'xpack.spaces.management.navigation.solutionViewDefaultValue',
                { defaultMessage: 'Select solution view' }
              )}
              isInvalid={validator.validateSolutionView(space, isEditing).isInvalid}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </SectionPanel>
  );
};
