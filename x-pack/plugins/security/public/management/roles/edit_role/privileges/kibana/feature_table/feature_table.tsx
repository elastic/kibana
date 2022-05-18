/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './feature_table.scss';

import type { EuiAccordionProps, EuiButtonGroupOptionProps } from '@elastic/eui';
import {
  EuiAccordion,
  EuiButtonGroup,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiIconTip,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ReactElement } from 'react';
import React, { Component } from 'react';

import type { AppCategory } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Role } from '../../../../../../../common/model';
import type { KibanaPrivileges, SecuredFeature } from '../../../../model';
import { NO_PRIVILEGE_VALUE } from '../constants';
import { FeatureTableCell } from '../feature_table_cell';
import type { PrivilegeFormCalculator } from '../privilege_form_calculator';
import { ChangeAllPrivilegesControl } from './change_all_privileges';
import { FeatureTableExpandedRow } from './feature_table_expanded_row';

interface Props {
  role: Role;
  privilegeCalculator: PrivilegeFormCalculator;
  kibanaPrivileges: KibanaPrivileges;
  privilegeIndex: number;
  onChange: (featureId: string, privileges: string[]) => void;
  onChangeAll: (privileges: string[]) => void;
  canCustomizeSubFeaturePrivileges: boolean;
  allSpacesSelected: boolean;
  disabled?: boolean;
}

export class FeatureTable extends Component<Props, {}> {
  public static defaultProps = {
    privilegeIndex: -1,
    showLocks: true,
  };

  private featureCategories: Map<string, SecuredFeature[]> = new Map();

  constructor(props: Props) {
    super(props);

    // features are static for the lifetime of the page, so this is safe to do here in a non-reactive manner
    props.kibanaPrivileges
      .getSecuredFeatures()
      .filter((feature) => feature.privileges != null || feature.reserved != null)
      .forEach((feature) => {
        if (!this.featureCategories.has(feature.category.id)) {
          this.featureCategories.set(feature.category.id, []);
        }
        this.featureCategories.get(feature.category.id)!.push(feature);
      });
  }

  public render() {
    const basePrivileges = this.props.kibanaPrivileges.getBasePrivileges(
      this.props.role.kibana[this.props.privilegeIndex]
    );

    const accordions: Array<{ order: number; element: ReactElement }> = [];
    this.featureCategories.forEach((featuresInCategory) => {
      const { category } = featuresInCategory[0];

      const featureCount = featuresInCategory.length;
      const grantedCount = featuresInCategory.filter(
        (feature) =>
          this.props.privilegeCalculator.getEffectivePrimaryFeaturePrivilege(
            feature.id,
            this.props.privilegeIndex,
            this.props.allSpacesSelected
          ) != null
      ).length;

      const canExpandCategory = true; // featuresInCategory.length > 1;

      const buttonContent = (
        <EuiFlexGroup
          data-test-subj={`featureCategoryButton_${category.id}`}
          alignItems={'center'}
          responsive={false}
          gutterSize="m"
        >
          {category.euiIconType ? (
            <EuiFlexItem grow={false}>
              <EuiIcon size="m" type={category.euiIconType} />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={1}>
            <EuiTitle size="xs">
              <h4 className="eui-displayInlineBlock">{category.label}</h4>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      );

      const label: string = i18n.translate(
        'xpack.security.management.editRole.featureTable.featureAccordionSwitchLabel',
        {
          defaultMessage:
            '{grantedCount} / {featureCount} {featureCount, plural, one {feature} other {features}} granted',
          values: {
            grantedCount,
            featureCount,
          },
        }
      );
      const extraAction = (
        <EuiText size="s" aria-hidden="true" color={'subdued'} data-test-subj="categoryLabel">
          {label}
        </EuiText>
      );

      const helpText = this.getCategoryHelpText(category);

      const accordion = (
        <EuiAccordion
          id={`featureCategory_${category.id}`}
          data-test-subj={`featureCategory_${category.id}`}
          key={category.id}
          arrowDisplay={canExpandCategory ? 'left' : 'none'}
          forceState={canExpandCategory ? undefined : 'closed'}
          buttonContent={buttonContent}
          extraAction={canExpandCategory ? extraAction : undefined}
        >
          <div>
            <EuiSpacer size="s" />
            {helpText && (
              <>
                <EuiCallOut iconType="iInCircle" size="s">
                  {helpText}
                </EuiCallOut>
                <EuiSpacer size="s" />
              </>
            )}
            <EuiFlexGroup direction="column" gutterSize="s">
              {featuresInCategory.map((feature) => (
                <EuiFlexItem key={feature.id}>
                  {this.renderPrivilegeControlsForFeature(feature)}
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </div>
        </EuiAccordion>
      );

      accordions.push({
        order: category.order ?? Number.MAX_SAFE_INTEGER,
        element: accordion,
      });
    });

    accordions.sort((a1, a2) => a1.order - a2.order);

    return (
      <div>
        <EuiFlexGroup alignItems={'flexEnd'}>
          <EuiFlexItem>
            <EuiText size="xs">
              <b>
                {i18n.translate(
                  'xpack.security.management.editRole.featureTable.featureVisibilityTitle',
                  {
                    defaultMessage: 'Customize feature privileges',
                  }
                )}
              </b>
            </EuiText>
          </EuiFlexItem>
          {!this.props.disabled && (
            <EuiFlexItem grow={false}>
              <ChangeAllPrivilegesControl
                privileges={basePrivileges}
                onChange={this.onChangeAllFeaturePrivileges}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiHorizontalRule margin={'m'} />
        {accordions.flatMap((a, idx) => [
          a.element,
          <EuiHorizontalRule key={`accordion-hr-${idx}`} margin={'m'} />,
        ])}
      </div>
    );
  }

  private renderPrivilegeControlsForFeature = (feature: SecuredFeature) => {
    const renderFeatureMarkup = (
      buttonContent: EuiAccordionProps['buttonContent'],
      extraAction: EuiAccordionProps['extraAction'],
      warningIcon: JSX.Element
    ) => {
      const { canCustomizeSubFeaturePrivileges } = this.props;
      const hasSubFeaturePrivileges = feature.getSubFeaturePrivileges().length > 0;

      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>{warningIcon}</EuiFlexItem>
          <EuiFlexItem>
            <EuiAccordion
              id={`featurePrivilegeControls_${feature.id}`}
              data-test-subj="featurePrivilegeControls"
              buttonContent={buttonContent}
              extraAction={extraAction}
              forceState={
                canCustomizeSubFeaturePrivileges && hasSubFeaturePrivileges ? undefined : 'closed'
              }
              arrowDisplay={
                canCustomizeSubFeaturePrivileges && hasSubFeaturePrivileges ? 'left' : 'none'
              }
            >
              <div className="subFeaturePrivilegeExpandedRegion">
                <FeatureTableExpandedRow
                  feature={feature}
                  privilegeIndex={this.props.privilegeIndex}
                  onChange={this.props.onChange}
                  privilegeCalculator={this.props.privilegeCalculator}
                  selectedFeaturePrivileges={
                    this.props.role.kibana[this.props.privilegeIndex].feature[feature.id] ?? []
                  }
                  disabled={this.props.disabled}
                />
              </div>
            </EuiAccordion>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };

    const primaryFeaturePrivileges = feature.getPrimaryFeaturePrivileges();

    if (feature.reserved && primaryFeaturePrivileges.length === 0) {
      const buttonContent = (
        <>
          {<EuiIcon type="empty" size="l" />} <FeatureTableCell feature={feature} />
        </>
      );

      const extraAction = (
        <EuiText style={{ maxWidth: 200 }} size={'xs'} data-test-subj="reservedFeatureDescription">
          {feature.reserved.description}
        </EuiText>
      );

      return renderFeatureMarkup(buttonContent, extraAction, <EuiIcon type="empty" />);
    }

    if (primaryFeaturePrivileges.length === 0) {
      return null;
    }

    const selectedPrivilegeId =
      this.props.privilegeCalculator.getDisplayedPrimaryFeaturePrivilegeId(
        feature.id,
        this.props.privilegeIndex,
        this.props.allSpacesSelected
      );
    const options: EuiButtonGroupOptionProps[] = primaryFeaturePrivileges
      .filter((privilege) => !privilege.disabled) // Don't show buttons for privileges that are disabled
      .map((privilege) => {
        const disabledDueToSpaceSelection =
          privilege.requireAllSpaces && !this.props.allSpacesSelected;
        return {
          id: `${feature.id}_${privilege.id}`,
          label: privilege.name,
          isDisabled: this.props.disabled || disabledDueToSpaceSelection,
        };
      });

    options.push({
      id: `${feature.id}_${NO_PRIVILEGE_VALUE}`,
      label: 'None',
      isDisabled: this.props.disabled ?? false,
    });

    let warningIcon = <EuiIconTip type="empty" content={null} />;
    if (
      this.props.privilegeCalculator.hasCustomizedSubFeaturePrivileges(
        feature.id,
        this.props.privilegeIndex,
        this.props.allSpacesSelected
      )
    ) {
      warningIcon = (
        <EuiIconTip
          type="alert"
          content={
            <FormattedMessage
              id="xpack.security.management.editRole.featureTable.privilegeCustomizationTooltip"
              defaultMessage="Feature has customized sub-feature privileges. Expand this row for more information."
            />
          }
        />
      );
    }

    const { canCustomizeSubFeaturePrivileges } = this.props;
    const hasSubFeaturePrivileges = feature.getSubFeaturePrivileges().length > 0;

    const showAccordionArrow = canCustomizeSubFeaturePrivileges && hasSubFeaturePrivileges;

    const buttonContent = (
      <>
        {!showAccordionArrow && <EuiIcon type="empty" size="l" />}{' '}
        <FeatureTableCell feature={feature} />
      </>
    );

    const extraAction = (
      <EuiButtonGroup
        name={`featurePrivilege_${feature.id}`}
        data-test-subj={`primaryFeaturePrivilegeControl`}
        isFullWidth={true}
        options={options}
        idSelected={`${feature.id}_${selectedPrivilegeId ?? NO_PRIVILEGE_VALUE}`}
        onChange={this.onChange(feature.id)}
        legend={i18n.translate('xpack.security.management.editRole.featureTable.actionLegendText', {
          defaultMessage: '{featureName} feature privilege',
          values: {
            featureName: feature.name,
          },
        })}
        style={{
          minWidth: 200,
        }}
      />
    );

    return renderFeatureMarkup(buttonContent, extraAction, warningIcon);
  };

  private onChange = (featureId: string) => (featurePrivilegeId: string) => {
    const privilege = featurePrivilegeId.substr(`${featureId}_`.length);
    if (privilege === NO_PRIVILEGE_VALUE) {
      this.props.onChange(featureId, []);
    } else {
      this.props.onChange(featureId, [privilege]);
    }
  };

  private onChangeAllFeaturePrivileges = (privilege: string) => {
    if (privilege === NO_PRIVILEGE_VALUE) {
      this.props.onChangeAll([]);
    } else {
      this.props.onChangeAll([privilege]);
    }
  };

  private getCategoryHelpText = (category: AppCategory) => {
    if (category.id === 'management') {
      return i18n.translate(
        'xpack.security.management.editRole.featureTable.managementCategoryHelpText',
        {
          defaultMessage:
            'Access to Stack Management is determined by both Elasticsearch and Kibana privileges, and cannot be explicitly disabled.',
        }
      );
    }
  };
}
