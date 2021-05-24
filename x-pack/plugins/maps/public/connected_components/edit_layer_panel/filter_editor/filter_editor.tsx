/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';

import {
  EuiButton,
  EuiCodeBlock,
  EuiTitle,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTextAlign,
  EuiButtonEmpty,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import type { IndexPattern, Query } from 'src/plugins/data/public';
import { APP_ID } from '../../../../common/constants';
import { getIndexPatternService, getData } from '../../../kibana_services';
import { GlobalFilterCheckbox } from '../../../components/global_filter_checkbox';
import { GlobalTimeCheckbox } from '../../../components/global_time_checkbox';
import { ILayer } from '../../../classes/layers/layer';

export interface Props {
  layer: ILayer;
  setLayerQuery: (id: string, query: Query) => void;
  updateSourceProp: (layerId: string, propName: string, value: unknown) => void;
}

interface State {
  isPopoverOpen: boolean;
  indexPatterns: IndexPattern[];
  isSourceTimeAware: boolean;
}

export class FilterEditor extends Component<Props, State> {
  private _isMounted = false;
  state: State = {
    isPopoverOpen: false,
    indexPatterns: [],
    isSourceTimeAware: false,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadIndexPatterns();
    this._loadSourceTimeAware();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadIndexPatterns() {
    // Filter only effects source so only load source indices.
    const indexPatternIds = this.props.layer.getSource().getIndexPatternIds();
    const indexPatterns: IndexPattern[] = [];
    const getIndexPatternPromises = indexPatternIds.map(async (indexPatternId) => {
      try {
        const indexPattern = await getIndexPatternService().get(indexPatternId);
        indexPatterns.push(indexPattern);
      } catch (err) {
        // unable to fetch index pattern
      }
    });

    await Promise.all(getIndexPatternPromises);

    if (!this._isMounted) {
      return;
    }

    this.setState({ indexPatterns });
  }

  async _loadSourceTimeAware() {
    const isSourceTimeAware = await this.props.layer.getSource().isTimeAware();
    if (this._isMounted) {
      this.setState({ isSourceTimeAware });
    }
  }

  _toggle = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _close = () => {
    this.setState({ isPopoverOpen: false });
  };

  _onQueryChange = ({ query }: { query?: Query }) => {
    if (!query) {
      return;
    }
    this.props.setLayerQuery(this.props.layer.getId(), query);
    this._close();
  };

  _onApplyGlobalQueryChange = (applyGlobalQuery: boolean) => {
    this.props.updateSourceProp(this.props.layer.getId(), 'applyGlobalQuery', applyGlobalQuery);
  };

  _onApplyGlobalTimeChange = (applyGlobalTime: boolean) => {
    this.props.updateSourceProp(this.props.layer.getId(), 'applyGlobalTime', applyGlobalTime);
  };

  _renderQueryPopover() {
    const layerQuery = this.props.layer.getQuery();
    const { SearchBar } = getData().ui;

    return (
      <EuiPopover
        id="layerQueryPopover"
        button={this._renderOpenButton()}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._close}
        anchorPosition="leftCenter"
        ownFocus
      >
        <div className="mapFilterEditor" data-test-subj="mapFilterEditor">
          <SearchBar
            appName={APP_ID}
            showFilterBar={false}
            showDatePicker={false}
            showQueryInput={true}
            query={layerQuery ? layerQuery : getData().query.queryString.getDefaultQuery()}
            onQuerySubmit={this._onQueryChange}
            indexPatterns={this.state.indexPatterns}
            customSubmitButton={
              <EuiButton fill data-test-subj="mapFilterEditorSubmitButton">
                <FormattedMessage
                  id="xpack.maps.layerPanel.filterEditor.queryBarSubmitButtonLabel"
                  defaultMessage="Set filter"
                />
              </EuiButton>
            }
          />
        </div>
      </EuiPopover>
    );
  }

  _renderQuery() {
    const query = this.props.layer.getQuery();
    if (!query || !query.query) {
      return (
        <EuiText size="s" textAlign="center">
          <p>
            <EuiTextColor color="subdued">
              <FormattedMessage
                id="xpack.maps.layerPanel.filterEditor.emptyState.description"
                defaultMessage="Add a filter to narrow the layer data."
              />
            </EuiTextColor>
          </p>
        </EuiText>
      );
    }

    return (
      <Fragment>
        <EuiCodeBlock paddingSize="s">{query.query}</EuiCodeBlock>

        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  _renderOpenButton() {
    const query = this.props.layer.getQuery();
    const openButtonLabel =
      query && query.query
        ? i18n.translate('xpack.maps.layerPanel.filterEditor.editFilterButtonLabel', {
            defaultMessage: 'Edit filter',
          })
        : i18n.translate('xpack.maps.layerPanel.filterEditor.addFilterButtonLabel', {
            defaultMessage: 'Add filter',
          });
    const openButtonIcon = query && query.query ? 'pencil' : 'plusInCircleFilled';

    return (
      <EuiButtonEmpty
        size="xs"
        onClick={this._toggle}
        data-test-subj="mapLayerPanelOpenFilterEditorButton"
        iconType={openButtonIcon}
      >
        {openButtonLabel}
      </EuiButtonEmpty>
    );
  }

  render() {
    const globalTimeCheckbox = this.state.isSourceTimeAware ? (
      <GlobalTimeCheckbox
        label={i18n.translate('xpack.maps.filterEditor.applyGlobalTimeCheckboxLabel', {
          defaultMessage: `Apply global time to layer data`,
        })}
        applyGlobalTime={this.props.layer.getSource().getApplyGlobalTime()}
        setApplyGlobalTime={this._onApplyGlobalTimeChange}
      />
    ) : null;
    return (
      <Fragment>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.maps.layerPanel.filterEditor.title"
              defaultMessage="Filtering"
            />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />

        {this._renderQuery()}

        <EuiTextAlign textAlign="center">{this._renderQueryPopover()}</EuiTextAlign>

        <EuiSpacer size="m" />

        <GlobalFilterCheckbox
          label={i18n.translate('xpack.maps.filterEditor.applyGlobalQueryCheckboxLabel', {
            defaultMessage: `Apply global filter to layer data`,
          })}
          applyGlobalQuery={this.props.layer.getSource().getApplyGlobalQuery()}
          setApplyGlobalQuery={this._onApplyGlobalQueryChange}
        />

        {globalTimeCheckbox}
      </Fragment>
    );
  }
}
