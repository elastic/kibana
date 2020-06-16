/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import {
  EuiCard,
  EuiIcon,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { getLayerWizards, LayerWizard } from '../../../classes/layers/layer_wizard_registry';
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';

interface Props {
  onSelect: (layerWizard: LayerWizard) => void;
}

interface State {
  activeCategories: LAYER_WIZARD_CATEGORY[];
  hasLoadedWizards: boolean;
  layerWizards: LayerWizard[];
  selectedCategory?: LAYER_WIZARD_CATEGORY;
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

  return category as string;
}

export class LayerWizardSelect extends Component<Props, State> {
  private _isMounted: boolean = false;

  state = {
    activeCategories: [],
    hasLoadedWizards: false,
    layerWizards: [],
    selectedCategory: undefined,
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

  _filterByCategory(category?: LAYER_WIZARD_CATEGORY) {
    this.setState({ selectedCategory: category });
  }

  _renderCategoryButtons() {
    if (this.state.activeCategories.length === 0) {
      return null;
    }

    const categoryButtons = this.state.activeCategories.map((category: LAYER_WIZARD_CATEGORY) => {
      return (
        <EuiFlexItem grow={false} key={category}>
          <EuiButtonEmpty color="text" onClick={() => this._filterByCategory(category)} size="xs">
            {getCategoryLabel(category)}
          </EuiButtonEmpty>
        </EuiFlexItem>
      );
    });

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty color="text" onClick={() => this._filterByCategory(undefined)} size="xs">
            <FormattedMessage
              id="xpack.maps.layerWizardSelect.allCategories"
              defaultMessage="All"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        {categoryButtons}
      </EuiFlexGroup>
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
      .filter((layerWizard: LayerWizard) => {
        return this.state.selectedCategory
          ? layerWizard.categories.includes(this.state.selectedCategory)
          : true;
      })
      .map((layerWizard: LayerWizard) => {
        const icon = layerWizard.icon ? <EuiIcon type={layerWizard.icon} size="l" /> : undefined;

        const onClick = () => {
          this.props.onSelect(layerWizard);
        };

        return (
          <EuiFlexItem key={layerWizard.title}>
            <EuiCard
              title={layerWizard.title}
              icon={icon}
              onClick={onClick}
              description={layerWizard.description}
              data-test-subj={_.camelCase(layerWizard.title)}
            />
          </EuiFlexItem>
        );
      });

    return (
      <>
        {this._renderCategoryButtons()}
        <EuiFlexGrid columns={2}>{wizardCards}</EuiFlexGrid>
      </>
    );
  }
}
