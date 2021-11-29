/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import {
  EuiCard,
  EuiIcon,
  EuiFlexGrid,
  EuiFlexItem,
  EuiLoadingContent,
  EuiFacetGroup,
  EuiFacetButton,
  EuiToolTip,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { getLayerWizards, LayerWizard, LayerWizardWithMeta } from '../../../classes/layers';
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';
import './layer_wizard_select.scss';

interface Props {
  onSelect: (layerWizard: LayerWizard) => void;
}

interface State {
  activeCategories: LAYER_WIZARD_CATEGORY[];
  hasLoadedWizards: boolean;
  layerWizards: LayerWizardWithMeta[];
  selectedCategory: LAYER_WIZARD_CATEGORY | null;
}

function getCategoryLabel(category: LAYER_WIZARD_CATEGORY): string {
  if (category === LAYER_WIZARD_CATEGORY.ELASTICSEARCH) {
    return i18n.translate('xpack.maps.layerWizardSelect.elasticsearchCategoryLabel', {
      defaultMessage: 'Elasticsearch',
    });
  }

  if (category === LAYER_WIZARD_CATEGORY.REFERENCE) {
    return i18n.translate('xpack.maps.layerWizardSelect.referenceCategoryLabel', {
      defaultMessage: 'Reference',
    });
  }

  if (category === LAYER_WIZARD_CATEGORY.SOLUTIONS) {
    return i18n.translate('xpack.maps.layerWizardSelect.solutionsCategoryLabel', {
      defaultMessage: 'Solutions',
    });
  }

  throw new Error(`Unexpected category: ${category}`);
}

export class LayerWizardSelect extends Component<Props, State> {
  private _isMounted: boolean = false;

  state = {
    activeCategories: [],
    hasLoadedWizards: false,
    layerWizards: [],
    selectedCategory: null,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadLayerWizards();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadLayerWizards() {
    const layerWizards = await getLayerWizards();
    const activeCategories: LAYER_WIZARD_CATEGORY[] = [];
    layerWizards.forEach((layerWizard: LayerWizard) => {
      layerWizard.categories.forEach((category: LAYER_WIZARD_CATEGORY) => {
        if (!activeCategories.includes(category)) {
          activeCategories.push(category);
        }
      });
    });

    if (this._isMounted) {
      this.setState({
        activeCategories,
        layerWizards,
        hasLoadedWizards: true,
      });
    }
  }

  _filterByCategory(category: LAYER_WIZARD_CATEGORY | null) {
    this.setState({ selectedCategory: category });
  }

  _renderCategoryFacets() {
    if (this.state.activeCategories.length === 0) {
      return null;
    }

    const facets = this.state.activeCategories.map((category: LAYER_WIZARD_CATEGORY) => {
      return (
        <EuiFacetButton
          key={category}
          isSelected={category === this.state.selectedCategory}
          onClick={() => this._filterByCategory(category)}
        >
          {getCategoryLabel(category)}
        </EuiFacetButton>
      );
    });

    return (
      <EuiFacetGroup layout="horizontal" gutterSize="s">
        <EuiFacetButton
          key="all"
          isSelected={!this.state.selectedCategory}
          onClick={() => this._filterByCategory(null)}
        >
          <FormattedMessage id="xpack.maps.layerWizardSelect.allCategories" defaultMessage="All" />
        </EuiFacetButton>
        {facets}
      </EuiFacetGroup>
    );
  }

  render() {
    if (!this.state.hasLoadedWizards) {
      return (
        <div>
          <EuiCard title={''} description={<EuiLoadingContent lines={2} />} layout="horizontal" />
        </div>
      );
    }

    const wizardCards = this.state.layerWizards
      .filter((layerWizard: LayerWizardWithMeta) => {
        return this.state.selectedCategory
          ? layerWizard.categories.includes(this.state.selectedCategory!)
          : true;
      })
      .map((layerWizard: LayerWizardWithMeta) => {
        const icon = layerWizard.icon ? <EuiIcon type={layerWizard.icon} size="l" /> : undefined;

        const onClick = () => {
          this.props.onSelect(layerWizard);
        };

        const card = (
          <EuiCard
            title={layerWizard.title}
            titleSize="xs"
            betaBadgeProps={{ label: layerWizard.isBeta ? 'beta' : undefined }}
            icon={icon}
            onClick={onClick}
            description={layerWizard.description}
            isDisabled={layerWizard.isDisabled}
            data-test-subj={_.camelCase(layerWizard.title)}
          />
        );

        return (
          <EuiFlexItem key={layerWizard.title}>
            {layerWizard.isDisabled && layerWizard.disabledReason ? (
              <EuiToolTip
                position="top"
                anchorClassName="mapMapLayerWizardSelect__tooltip"
                content={layerWizard.disabledReason}
              >
                {card}
              </EuiToolTip>
            ) : (
              card
            )}
          </EuiFlexItem>
        );
      });

    return (
      <>
        {this._renderCategoryFacets()}

        <EuiSpacer size="s" />
        <EuiFlexGrid columns={2} gutterSize="m">
          {wizardCards}
        </EuiFlexGrid>
      </>
    );
  }
}
