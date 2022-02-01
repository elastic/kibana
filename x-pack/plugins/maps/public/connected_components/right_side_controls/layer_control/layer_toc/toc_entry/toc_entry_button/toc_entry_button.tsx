/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment, ReactNode } from 'react';

import { EuiButtonEmpty, EuiIcon, EuiToolTip, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ILayer } from '../../../../../../classes/layers/layer';
import { IVectorSource } from '../../../../../../classes/sources/vector_source';

interface Footnote {
  icon: ReactNode;
  message?: string | null;
}

interface IconAndTooltipContent {
  icon?: ReactNode;
  tooltipContent?: string | null;
  footnotes: Footnote[];
}

export interface ReduxStateProps {
  isUsingSearch: boolean;
  zoom: number;
}

export interface OwnProps {
  displayName: string;
  escapedDisplayName: string;
  layer: ILayer;
  onClick: () => void;
}

type Props = ReduxStateProps & OwnProps;

interface State {
  isFilteredByGlobalTime: boolean;
}

export class TOCEntryButton extends Component<Props, State> {
  private _isMounted: boolean = false;

  state: State = {
    isFilteredByGlobalTime: false,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadIsFilteredByGlobalTime();
  }

  componentDidUpdate() {
    this._loadIsFilteredByGlobalTime();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadIsFilteredByGlobalTime() {
    const isFilteredByGlobalTime = await this.props.layer.isFilteredByGlobalTime();
    if (this._isMounted && isFilteredByGlobalTime !== this.state.isFilteredByGlobalTime) {
      this.setState({ isFilteredByGlobalTime });
    }
  }

  getIconAndTooltipContent(): IconAndTooltipContent {
    let icon;
    let tooltipContent = null;
    const footnotes = [];
    if (this.props.layer.hasErrors()) {
      icon = (
        <EuiIcon
          aria-label={i18n.translate('xpack.maps.layer.loadWarningAriaLabel', {
            defaultMessage: 'Load warning',
          })}
          size="m"
          type="alert"
          color="warning"
        />
      );
      tooltipContent = this.props.layer.getErrors();
    } else if (!this.props.layer.isVisible()) {
      icon = <EuiIcon size="m" type="eyeClosed" />;
      tooltipContent = i18n.translate('xpack.maps.layer.layerHiddenTooltip', {
        defaultMessage: `Layer is hidden.`,
      });
    } else if (this.props.layer.isLayerLoading()) {
      icon = <EuiLoadingSpinner size="m" />;
    } else if (!this.props.layer.showAtZoomLevel(this.props.zoom)) {
      const minZoom = this.props.layer.getMinZoom();
      const maxZoom = this.props.layer.getMaxZoom();
      icon = <EuiIcon size="m" type="expand" />;
      tooltipContent = i18n.translate('xpack.maps.layer.zoomFeedbackTooltip', {
        defaultMessage: `Layer is visible between zoom levels {minZoom} and {maxZoom}.`,
        values: { minZoom, maxZoom },
      });
    } else {
      const { icon: layerIcon, tooltipContent: layerTooltipContent } =
        this.props.layer.getLayerIcon(true);
      icon = layerIcon;
      if (layerTooltipContent) {
        tooltipContent = layerTooltipContent;
      }

      if (this.props.isUsingSearch && this.props.layer.getQueryableIndexPatternIds().length) {
        footnotes.push({
          icon: <EuiIcon color="subdued" type="filter" size="s" />,
          message: i18n.translate('xpack.maps.layer.isUsingSearchMsg', {
            defaultMessage: 'Results narrowed by global search',
          }),
        });
      }
      if (this.state.isFilteredByGlobalTime) {
        footnotes.push({
          icon: <EuiIcon color="subdued" type="clock" size="s" />,
          message: i18n.translate('xpack.maps.layer.isUsingTimeFilter', {
            defaultMessage: 'Results narrowed by global time',
          }),
        });
      }
      const source = this.props.layer.getSource();
      if (
        typeof source.isFilterByMapBounds === 'function' &&
        (source as IVectorSource).isFilterByMapBounds()
      ) {
        footnotes.push({
          icon: <EuiIcon color="subdued" type="stop" size="s" />,
          message: i18n.translate('xpack.maps.layer.isUsingBoundsFilter', {
            defaultMessage: 'Results narrowed by visible map area',
          }),
        });
      }
    }

    return {
      icon,
      tooltipContent,
      footnotes,
    };
  }

  render() {
    const { icon, tooltipContent, footnotes } = this.getIconAndTooltipContent();

    const footnoteIcons = footnotes.map((footnote, index) => {
      return (
        <Fragment key={index}>
          {''}
          {footnote.icon}
        </Fragment>
      );
    });
    const footnoteTooltipContent = footnotes.map((footnote, index) => {
      return (
        <div key={index}>
          {footnote.icon} {footnote.message}
        </div>
      );
    });

    return (
      <EuiToolTip
        anchorClassName="mapLayTocActions__tooltipAnchor"
        position="top"
        title={this.props.displayName}
        content={
          <Fragment>
            {tooltipContent}
            {footnoteTooltipContent}
          </Fragment>
        }
        data-test-subj="layerTocTooltip"
      >
        <EuiButtonEmpty
          className="mapTocEntry__layerName eui-textLeft"
          size="xs"
          flush="left"
          color="text"
          onClick={this.props.onClick}
          data-test-subj={`layerTocActionsPanelToggleButton${this.props.escapedDisplayName}`}
        >
          <span className="mapTocEntry__layerNameIcon">{icon}</span>
          {this.props.displayName} {footnoteIcons}
        </EuiButtonEmpty>
      </EuiToolTip>
    );
  }
}
