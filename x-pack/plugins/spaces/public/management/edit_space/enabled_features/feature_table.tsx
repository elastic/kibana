/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiAccordion,
  EuiCheckbox,
  EuiCheckboxProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import React, { ChangeEvent, Component, ReactElement } from 'react';
import { KibanaFeatureConfig } from '../../../../../../plugins/features/public';
import { Space } from '../../../../common/model/space';
import { getEnabledFeatures } from '../../lib/feature_utils';
import './feature_table.scss';

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

    const accordians: Array<{ order: number; element: ReactElement }> = [];
    this.featureCategories.forEach((featuresInCategory) => {
      const { category } = featuresInCategory[0];

      const featureCount = featuresInCategory.length;
      const enabledCount = getEnabledFeatures(featuresInCategory, space).length;

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
          alignItems={'center'}
          responsive={false}
          gutterSize="m"
        >
          <EuiFlexItem grow={false}>
            <EuiCheckbox {...checkboxProps} />
          </EuiFlexItem>
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

      // TODO: Enable once https://github.com/elastic/eui/issues/3881 is resolved (will land in version 28.4.0)
      // const label: string = i18n.translate('xpack.spaces.management.featureAccordionSwitchLabel', {
      //   defaultMessage: '{enabledCount} / {featureCount} features visible',
      //   values: {
      //     enabledCount,
      //     featureCount,
      //   },
      // });
      // const extraAction = (
      //   <EuiText size="s" aria-hidden="true" color={'subdued'}>
      //     {label}
      //   </EuiText>
      // );

      const accordian = (
        <EuiAccordion
          id={`featureCategory_${category.id}`}
          key={category.id}
          arrowDisplay="right"
          buttonContent={buttonContent}
          // extraAction={extraAction}
        >
          <div className="spcFeatureTableAccordionContent">
            <EuiSpacer size="s" />
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
          </div>
        </EuiAccordion>
      );

      accordians.push({
        order: category.order ?? Number.MAX_SAFE_INTEGER,
        element: accordian,
      });
    });

    accordians.sort((a1, a2) => a1.order - a2.order);

    const featureCount = this.props.features.length;
    const enabledCount = getEnabledFeatures(this.props.features, this.props.space).length;
    const controls = [];
    if (enabledCount < featureCount) {
      controls.push(
        <EuiLink onClick={() => this.showAll()} data-test-subj="showAllFeaturesLink">
          <EuiText size="xs">
            {i18n.translate('xpack.spaces.management.showAllFeaturesLink', {
              defaultMessage: 'Show all',
            })}
          </EuiText>
        </EuiLink>
      );
    }
    if (enabledCount > 0) {
      controls.push(
        <EuiLink onClick={() => this.hideAll()} data-test-subj="hideAllFeaturesLink">
          <EuiText size="xs">
            {i18n.translate('xpack.spaces.management.hideAllFeaturesLink', {
              defaultMessage: 'Hide all',
            })}
          </EuiText>
        </EuiLink>
      );
    }

    return (
      <div>
        <EuiFlexGroup alignItems={'flexEnd'}>
          <EuiFlexItem>
            <EuiText size="xs">
              <b>Feature visibility</b>
            </EuiText>
          </EuiFlexItem>
          {controls.map((control, idx) => (
            <EuiFlexItem grow={false} key={idx}>
              {control}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        <EuiHorizontalRule margin={'m'} />
        {accordians.flatMap((a, idx) => [
          a.element,
          <EuiHorizontalRule key={`accordion-hr-${idx}`} margin={'m'} />,
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
}
