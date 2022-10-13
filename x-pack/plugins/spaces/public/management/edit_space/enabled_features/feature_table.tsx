/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCheckboxProps } from '@elastic/eui';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import _ from 'lodash';
import type { ChangeEvent, ReactElement } from 'react';
import React, { Component } from 'react';

import type { AppCategory } from '@kbn/core/public';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/public';
import { i18n } from '@kbn/i18n';

import type { Space } from '../../../../common';
import { getEnabledFeatures } from '../../lib/feature_utils';

interface Props {
  space: Partial<Space>;
  features: KibanaFeatureConfig[];
  onChange: (space: Partial<Space>) => void;
}

export class FeatureTable extends Component<Props, {}> {
  private featureCategories: Map<string, KibanaFeatureConfig[]> = new Map();

  constructor(props: Props) {
    super(props);
    // features are static for the lifetime of the page, so this is safe to do here in a non-reactive manner
    props.features.forEach((feature) => {
      if (!this.featureCategories.has(feature.category.id)) {
        this.featureCategories.set(feature.category.id, []);
      }
      this.featureCategories.get(feature.category.id)!.push(feature);
    });
  }

  public render() {
    const { space } = this.props;

    const accordions: Array<{ order: number; element: ReactElement }> = [];
    this.featureCategories.forEach((featuresInCategory) => {
      const { category } = featuresInCategory[0];

      const featureCount = featuresInCategory.length;
      const enabledCount = getEnabledFeatures(featuresInCategory, space).length;

      const canExpandCategory = featuresInCategory.length > 1;

      const checkboxProps: EuiCheckboxProps = {
        id: `featureCategoryCheckbox_${category.id}`,
        indeterminate: enabledCount > 0 && enabledCount < featureCount,
        checked: featureCount === enabledCount,
        ['aria-label']: i18n.translate(
          'xpack.spaces.management.enabledFeatures.featureCategoryButtonLabel',
          { defaultMessage: 'Category toggle' }
        ),
        onClick: (e) => {
          // Clicking the checkbox should not cause the accordion to expand.
          // Stopping event propagation ensures this.
          e.stopPropagation();
        },
        onChange: (e) => {
          this.setFeaturesVisibility(
            featuresInCategory.map((f) => f.id),
            e.target.checked
          );
        },
      };

      const buttonContent = (
        <EuiFlexGroup
          data-test-subj={`featureCategoryButton_${category.id}`}
          alignItems="center"
          responsive={false}
          gutterSize="s"
          onClick={() => {
            if (!canExpandCategory) {
              const isChecked = enabledCount > 0;
              this.setFeaturesVisibility(
                featuresInCategory.map((f) => f.id),
                !isChecked
              );
            }
          }}
        >
          {category.euiIconType ? (
            <EuiFlexItem grow={false}>
              <EuiIcon size="m" type={category.euiIconType} />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={1}>
            <EuiTitle size="xxs">
              <h4>{category.label}</h4>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      );

      const label: string = i18n.translate('xpack.spaces.management.featureAccordionSwitchLabel', {
        defaultMessage: '{enabledCount}/{featureCount} features visible',
        values: {
          enabledCount,
          featureCount,
        },
      });
      const extraAction = (
        <EuiText size="xs" aria-hidden="true" color="subdued">
          {label}
        </EuiText>
      );

      const helpText = this.getCategoryHelpText(category);

      const accordion = (
        <EuiFlexGroup key={category.id} alignItems="baseline" responsive={false} gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiCheckbox {...checkboxProps} />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiAccordion
              id={`featureCategory_${category.id}`}
              data-test-subj={`featureCategory_${category.id}`}
              arrowDisplay={canExpandCategory ? 'right' : 'none'}
              forceState={canExpandCategory ? undefined : 'closed'}
              buttonContent={buttonContent}
              extraAction={canExpandCategory ? extraAction : undefined}
            >
              <EuiSpacer size="m" />
              {helpText && (
                <>
                  <EuiCallOut iconType="iInCircle" size="s">
                    {helpText}
                  </EuiCallOut>
                  <EuiSpacer size="m" />
                </>
              )}
              {featuresInCategory.map((feature) => {
                const featureChecked = !(
                  space.disabledFeatures && space.disabledFeatures.includes(feature.id)
                );

                return (
                  <EuiFlexGroup key={`${feature.id}-toggle`}>
                    <EuiFlexItem grow={false}>
                      <EuiCheckbox
                        id={`featureCheckbox_${feature.id}`}
                        data-test-subj={`featureCheckbox_${feature.id}`}
                        checked={featureChecked}
                        onChange={this.onChange(feature.id) as any}
                        label={feature.name}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                );
              })}
            </EuiAccordion>
          </EuiFlexItem>
        </EuiFlexGroup>
      );

      accordions.push({
        order: category.order ?? Number.MAX_SAFE_INTEGER,
        element: accordion,
      });
    });

    accordions.sort((a1, a2) => a1.order - a2.order);

    const featureCount = this.props.features.length;
    const enabledCount = getEnabledFeatures(this.props.features, this.props.space).length;
    const controls = [];
    if (enabledCount < featureCount) {
      controls.push(
        <EuiButtonEmpty
          onClick={() => this.showAll()}
          size="xs"
          data-test-subj="showAllFeaturesLink"
        >
          {i18n.translate('xpack.spaces.management.selectAllFeaturesLink', {
            defaultMessage: 'Show all',
          })}
        </EuiButtonEmpty>
      );
    }
    if (enabledCount > 0) {
      controls.push(
        <EuiButtonEmpty
          onClick={() => this.hideAll()}
          size="xs"
          data-test-subj="hideAllFeaturesLink"
        >
          {i18n.translate('xpack.spaces.management.deselectAllFeaturesLink', {
            defaultMessage: 'Hide all',
          })}
        </EuiButtonEmpty>
      );
    }

    return (
      <div>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiText size="xs">
              <b>
                {i18n.translate('xpack.spaces.management.featureVisibilityTitle', {
                  defaultMessage: 'Feature visibility',
                })}
              </b>
            </EuiText>
          </EuiFlexItem>
          {controls.map((control, idx) => (
            <EuiFlexItem grow={false} key={idx}>
              {control}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        <EuiHorizontalRule margin="m" />
        {accordions.flatMap((a, idx) => [
          a.element,
          <EuiHorizontalRule key={`accordion-hr-${idx}`} margin="m" />,
        ])}
      </div>
    );
  }

  public onChange = (featureId: string) => (e: ChangeEvent<HTMLInputElement>) => {
    const updatedSpace: Partial<Space> = {
      ...this.props.space,
    };

    let disabledFeatures = updatedSpace.disabledFeatures || [];

    const isFeatureEnabled = (e.target as Record<string, any>).checked;
    if (isFeatureEnabled) {
      disabledFeatures = disabledFeatures.filter((feature) => feature !== featureId);
    } else {
      disabledFeatures = _.uniq([...disabledFeatures, featureId]);
    }

    updatedSpace.disabledFeatures = disabledFeatures;
    this.props.onChange(updatedSpace);
  };

  private getAllFeatureIds = () =>
    [...this.featureCategories.values()].flat().map((feature) => feature.id);

  private hideAll = () => {
    this.setFeaturesVisibility(this.getAllFeatureIds(), false);
  };

  private showAll = () => {
    this.setFeaturesVisibility(this.getAllFeatureIds(), true);
  };

  private setFeaturesVisibility = (features: string[], visible: boolean) => {
    const updatedSpace: Partial<Space> = {
      ...this.props.space,
    };

    if (visible) {
      updatedSpace.disabledFeatures = (updatedSpace.disabledFeatures ?? []).filter(
        (df) => !features.includes(df)
      );
    } else {
      updatedSpace.disabledFeatures = Array.from(
        new Set([...(updatedSpace.disabledFeatures ?? []), ...features])
      );
    }

    this.props.onChange(updatedSpace);
  };

  private getCategoryHelpText = (category: AppCategory) => {
    if (category.id === 'management') {
      return i18n.translate('xpack.spaces.management.managementCategoryHelpText', {
        defaultMessage:
          'Access to Stack Management is determined by your privileges, and cannot be hidden by Spaces.',
      });
    }
  };
}
