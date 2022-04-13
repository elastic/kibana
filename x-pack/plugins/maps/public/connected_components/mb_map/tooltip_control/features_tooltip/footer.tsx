/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component, Fragment } from 'react';
import {
  EuiPagination,
  EuiSelect,
  EuiSelectOption,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { TooltipFeature } from '../../../../../common/descriptor_types';
import { IVectorLayer } from '../../../../classes/layers/vector_layer';

const ALL_LAYERS = '_ALL_LAYERS_';
const DEFAULT_PAGE_NUMBER = 0;

interface Props {
  features: TooltipFeature[];
  isLocked: boolean;
  findLayerById: (layerId: string) => IVectorLayer | undefined;
  setCurrentFeature: (feature: TooltipFeature) => void;
}

interface State {
  filteredFeatures: TooltipFeature[];
  pageNumber: number;
  selectedLayerId: string;
  layerOptions: EuiSelectOption[];
}

export class Footer extends Component<Props, State> {
  private _isMounted = false;
  private _prevFeatures: TooltipFeature[] | null = null;
  state: State = {
    filteredFeatures: this.props.features,
    pageNumber: DEFAULT_PAGE_NUMBER,
    selectedLayerId: ALL_LAYERS,
    layerOptions: [],
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadUniqueLayers();
  }

  componentDidUpdate() {
    this._loadUniqueLayers();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _loadUniqueLayers = async () => {
    if (this._prevFeatures === this.props.features) {
      return;
    }

    this._prevFeatures = this.props.features;

    const countByLayerId = new Map<string, number>();
    for (let i = 0; i < this.props.features.length; i++) {
      let count = countByLayerId.get(this.props.features[i].layerId);
      if (!count) {
        count = 0;
      }
      count++;
      countByLayerId.set(this.props.features[i].layerId, count);
    }

    const layers: IVectorLayer[] = [];
    countByLayerId.forEach((count, layerId) => {
      const layer = this.props.findLayerById(layerId);
      if (layer) {
        layers.push(layer);
      }
    });
    const layerNamePromises = layers.map((layer) => {
      return layer.getDisplayName();
    });
    const layerNames = await Promise.all(layerNamePromises);

    if (this._isMounted) {
      this.setState(
        {
          filteredFeatures: this.props.features,
          selectedLayerId: ALL_LAYERS,
          layerOptions: layers.map((layer, index) => {
            const displayName = layerNames[index];
            const count = countByLayerId.get(layer.getId());
            return {
              value: layer.getId(),
              text: `(${count}) ${displayName}`,
            };
          }),
        },
        () => this._onPageChange(DEFAULT_PAGE_NUMBER)
      );
    }
  };

  _onPageChange = (pageNumber: number) => {
    this.setState({ pageNumber });
    this.props.setCurrentFeature(this.state.filteredFeatures[pageNumber]);
  };

  _onLayerChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newLayerId = e.target.value;
    if (this.state.selectedLayerId === newLayerId) {
      return;
    }

    const filteredFeatures =
      newLayerId === ALL_LAYERS
        ? this.props.features
        : this.props.features.filter((feature) => {
            return feature.layerId === newLayerId;
          });

    this.setState(
      {
        filteredFeatures,
        selectedLayerId: newLayerId,
      },
      () => this._onPageChange(DEFAULT_PAGE_NUMBER)
    );
  };

  render() {
    const { isLocked } = this.props;
    const { filteredFeatures, pageNumber, selectedLayerId, layerOptions } = this.state;

    const isLayerSelectVisible = isLocked && layerOptions.length > 1;
    const items = [];

    // Pagination controls
    if (isLocked && filteredFeatures.length > 1) {
      items.push(
        <EuiFlexItem grow={false} key="pagination">
          <EuiPagination
            pageCount={filteredFeatures.length}
            activePage={pageNumber}
            onPageClick={this._onPageChange}
            compressed
          />
        </EuiFlexItem>
      );
    }

    // Page number readout
    if (!isLocked && filteredFeatures.length > 1) {
      items.push(
        <EuiFlexItem grow={!isLayerSelectVisible} key="pageNumber">
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.maps.tooltip.pageNumerText"
              defaultMessage="{pageNumber} of {total}"
              values={{
                pageNumber: pageNumber + 1,
                total: filteredFeatures.length,
              }}
            />
          </EuiTextColor>
        </EuiFlexItem>
      );
    }

    // Layer select
    if (isLayerSelectVisible) {
      items.push(
        <EuiFlexItem key="layerSelect">
          <EuiFormRow display="rowCompressed">
            <EuiSelect
              options={[
                {
                  value: ALL_LAYERS,
                  text: i18n.translate('xpack.maps.tooltip.allLayersLabel', {
                    defaultMessage: 'All layers',
                  }),
                },
                ...layerOptions,
              ]}
              onChange={this._onLayerChange}
              value={selectedLayerId}
              compressed
              fullWidth
              aria-label={i18n.translate('xpack.maps.tooltip.layerFilterLabel', {
                defaultMessage: 'Filter results by layer',
              })}
            />
          </EuiFormRow>
        </EuiFlexItem>
      );
    }

    return items.length ? (
      <Fragment>
        <EuiHorizontalRule margin="xs" />

        <EuiFlexGroup alignItems="center" gutterSize="s">
          {items}
        </EuiFlexGroup>
      </Fragment>
    ) : null;
  }
}
