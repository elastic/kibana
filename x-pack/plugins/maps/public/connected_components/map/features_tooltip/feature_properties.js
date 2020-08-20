/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiLoadingSpinner,
  EuiTextAlign,
  EuiButtonIcon,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export class FeatureProperties extends React.Component {
  state = {
    properties: null,
    actions: [],
    loadPropertiesErrorMsg: null,
    prevWidth: null,
    prevHeight: null,
  };

  componentDidMount() {
    this._isMounted = true;
    this.prevLayerId = undefined;
    this.prevFeatureId = undefined;
    this._loadProperties();
    this._loadActions();
  }

  componentDidUpdate() {
    this._loadProperties();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadActions() {
    if (!this.props.getFilterActions) {
      return;
    }
    const actions = await this.props.getFilterActions();
    if (this._isMounted) {
      this.setState({ actions });
    }
  }

  _loadProperties = async () => {
    this._fetchProperties({
      nextFeatureId: this.props.featureId,
      nextLayerId: this.props.layerId,
      mbProperties: this.props.mbProperties,
    });
  };

  _fetchProperties = async ({ nextLayerId, nextFeatureId, mbProperties }) => {
    if (this.prevLayerId === nextLayerId && this.prevFeatureId === nextFeatureId) {
      // do not reload same feature properties
      return;
    }

    this.prevLayerId = nextLayerId;
    this.prevFeatureId = nextFeatureId;
    this.setState({
      properties: undefined,
      loadPropertiesErrorMsg: undefined,
    });

    // Preserve current properties width/height so they can be used while rendering loading indicator.
    if (this.state.properties && this._node) {
      this.setState({
        prevWidth: this._node.clientWidth,
        prevHeight: this._node.clientHeight,
      });
    }

    let properties;
    try {
      properties = await this.props.loadFeatureProperties({
        layerId: nextLayerId,
        featureId: nextFeatureId,
        mbProperties: mbProperties,
      });
    } catch (error) {
      if (this._isMounted) {
        this.setState({
          properties: [],
          loadPropertiesErrorMsg: error.message,
        });
      }
      return;
    }

    if (this.prevLayerId !== nextLayerId && this.prevFeatureId !== nextFeatureId) {
      // ignore results for old request
      return;
    }

    if (this._isMounted) {
      this.setState({ properties });
    }
  };

  _renderFilterCell(tooltipProperty) {
    if (!this.props.showFilterButtons || !tooltipProperty.isFilterable()) {
      return null;
    }

    const actionButtons = [
      <EuiButtonIcon
        key="addFilter"
        className="mapFeatureTooltip__filterButton"
        iconType="filter"
        title={i18n.translate('xpack.maps.tooltip.filterOnPropertyTitle', {
          defaultMessage: 'Filter on property',
        })}
        onClick={async () => {
          this.props.onCloseTooltip();
          const filters = await tooltipProperty.getESFilters();
          this.props.addFilters(filters);
        }}
        aria-label={i18n.translate('xpack.maps.tooltip.filterOnPropertyAriaLabel', {
          defaultMessage: 'Filter on property',
        })}
        data-test-subj="mapTooltipCreateFilterButton"
      />,
    ];

    if (this.state.actions.length) {
      this.state.actions.forEach((action) => {
        actionButtons.push(
          <div>
            <EuiButtonEmpty
              key={action.id}
              iconType={action.getIconType()}
              onClick={async () => {
                this.props.onCloseTooltip();
                const filters = await tooltipProperty.getESFilters();
                this.props.addFilters(filters, action.id);
              }}
              data-test-subj={`mapTooltipAddFilterButton_${action.id}`}
            >
              {action.getDisplayName()}
            </EuiButtonEmpty>
          </div>
        );
      });
    }

    return <td>{actionButtons}</td>;
  }

  render() {
    if (this.state.loadPropertiesErrorMsg) {
      return (
        <EuiCallOut
          title={i18n.translate('xpack.maps.tooltip.unableToLoadContentTitle', {
            defaultMessage: 'Unable to load tooltip content',
          })}
          color="danger"
          iconType="alert"
          size="s"
        >
          <p>{this.state.loadPropertiesErrorMsg}</p>
        </EuiCallOut>
      );
    }

    if (!this.state.properties) {
      const loadingMsg = i18n.translate('xpack.maps.tooltip.loadingMsg', {
        defaultMessage: 'Loading',
      });
      // Use width/height of last viewed properties while displaying loading status
      // to avoid resizing component during loading phase and bouncing tooltip container around
      const style = {};
      if (this.state.prevWidth && this.state.prevHeight) {
        style.width = this.state.prevWidth;
        style.height = this.state.prevHeight;
      }
      return (
        <EuiTextAlign textAlign="center" style={style}>
          <EuiLoadingSpinner size="m" />
          {loadingMsg}
        </EuiTextAlign>
      );
    }

    const rows = this.state.properties.map((tooltipProperty) => {
      const label = tooltipProperty.getPropertyName();
      return (
        <tr key={label}>
          <td className="eui-textOverflowWrap mapFeatureTooltip__propertyLabel">{label}</td>
          <td
            className="eui-textOverflowWrap"
            /*
             * Justification for dangerouslySetInnerHTML:
             * Property value contains value generated by Field formatter
             * Since these formatters produce raw HTML, this component needs to be able to render them as-is, relying
             * on the field formatter to only produce safe HTML.
             */
            dangerouslySetInnerHTML={{ __html: tooltipProperty.getHtmlDisplayValue() }} //eslint-disable-line react/no-danger
          />
          {this._renderFilterCell(tooltipProperty)}
        </tr>
      );
    });

    return (
      <table
        className="eui-yScrollWithShadows mapFeatureTooltip_table"
        ref={(node) => (this._node = node)}
      >
        <tbody>{rows}</tbody>
      </table>
    );
  }
}
