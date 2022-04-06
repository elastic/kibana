/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component, CSSProperties, RefObject, ReactNode } from 'react';
import {
  EuiCallOut,
  EuiLoadingSpinner,
  EuiTextAlign,
  EuiButtonEmpty,
  EuiIcon,
  EuiContextMenu,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionExecutionContext, Action } from 'src/plugins/ui_actions/public';
import { GeoJsonProperties } from 'geojson';
import { Filter } from '@kbn/es-query';
import { ACTION_GLOBAL_APPLY_FILTER } from '../../../../../../../../src/plugins/unified_search/public';
import { isUrlDrilldown } from '../../../../trigger_actions/trigger_utils';
import { RawValue } from '../../../../../common/constants';
import { ITooltipProperty } from '../../../../classes/tooltips/tooltip_property';

interface Props {
  featureId?: string | number;
  layerId: string;
  mbProperties: GeoJsonProperties;
  loadFeatureProperties: ({
    layerId,
    properties,
  }: {
    layerId: string;
    properties: GeoJsonProperties;
  }) => Promise<ITooltipProperty[]>;
  showFilterButtons: boolean;
  onCloseTooltip: () => void;
  addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
  onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => void;
  showFilterActions: (view: ReactNode) => void;
}

interface State {
  properties: ITooltipProperty[] | null;
  actions: Action[];
  loadPropertiesErrorMsg: string | null;
  prevWidth: number | null;
  prevHeight: number | null;
}

export class FeatureProperties extends Component<Props, State> {
  private _isMounted = false;
  private _prevLayerId: string = '';
  private _prevFeatureId?: string | number = '';
  private _prevMbProperties?: GeoJsonProperties;
  private readonly _tableRef: RefObject<HTMLTableElement> = React.createRef();

  state: State = {
    properties: null,
    actions: [],
    loadPropertiesErrorMsg: null,
    prevWidth: null,
    prevHeight: null,
  };

  componentDidMount() {
    this._isMounted = true;
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

  _showFilterActions = (
    tooltipProperty: ITooltipProperty,
    getActionContext: () => ActionExecutionContext,
    addFilters: (filters: Filter[], actionId: string) => Promise<void>
  ) => {
    this.props.showFilterActions(
      this._renderFilterActions(tooltipProperty, getActionContext, addFilters)
    );
  };

  _fetchProperties = async ({
    nextLayerId,
    nextFeatureId,
    mbProperties,
  }: {
    nextLayerId: string;
    nextFeatureId?: string | number;
    mbProperties: GeoJsonProperties;
  }) => {
    if (
      this._prevLayerId === nextLayerId &&
      this._prevFeatureId === nextFeatureId &&
      _.isEqual(this._prevMbProperties, mbProperties)
    ) {
      // do not reload same feature properties
      return;
    }

    this._prevLayerId = nextLayerId;
    this._prevFeatureId = nextFeatureId;
    this._prevMbProperties = mbProperties;
    this.setState({
      properties: null,
      loadPropertiesErrorMsg: null,
    });

    // Preserve current properties width/height so they can be used while rendering loading indicator.
    if (this.state.properties && this._tableRef.current) {
      this.setState({
        prevWidth: this._tableRef.current.clientWidth,
        prevHeight: this._tableRef.current.clientHeight,
      });
    }

    let properties;
    try {
      properties = await this.props.loadFeatureProperties({
        layerId: nextLayerId,
        properties: mbProperties,
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

    if (this._prevLayerId !== nextLayerId && this._prevFeatureId !== nextFeatureId) {
      // ignore results for old request
      return;
    }

    if (this._isMounted) {
      this.setState({ properties });
    }
  };

  _renderFilterActions(
    tooltipProperty: ITooltipProperty,
    getActionContext: () => ActionExecutionContext,
    addFilters: (filters: Filter[], actionId: string) => Promise<void>
  ) {
    const panel = {
      id: 0,
      items: this.state.actions
        .filter((action) => {
          if (isUrlDrilldown(action)) {
            return !!this.props.onSingleValueTrigger;
          }
          return true;
        })
        .map((action) => {
          const actionContext = getActionContext();
          const iconType = action.getIconType(actionContext);
          const name = action.getDisplayName(actionContext);
          return {
            name: name ? name : action.id,
            icon: iconType ? <EuiIcon type={iconType} /> : undefined,
            onClick: async () => {
              this.props.onCloseTooltip();

              if (isUrlDrilldown(action)) {
                this.props.onSingleValueTrigger!(
                  action.id,
                  tooltipProperty.getPropertyKey(),
                  tooltipProperty.getRawValue()
                );
              } else {
                const filters = await tooltipProperty.getESFilters();
                addFilters(filters, action.id);
              }
            },
            ['data-test-subj']: `mapFilterActionButton__${name}`,
          };
        }),
    };

    return (
      <div>
        <table className="eui-yScrollWithShadows mapFeatureTooltip_table" ref={this._tableRef}>
          <tbody>
            <tr>
              <td className="eui-textOverflowWrap mapFeatureTooltip__propertyLabel">
                {tooltipProperty.getPropertyName()}
              </td>
              <td className="eui-textOverflowWrap">{tooltipProperty.getHtmlDisplayValue()}</td>
            </tr>
          </tbody>
        </table>
        <EuiContextMenu initialPanelId={0} panels={[panel]} />
      </div>
    );
  }

  _renderFilterCell(tooltipProperty: ITooltipProperty) {
    if (
      !this.props.showFilterButtons ||
      !tooltipProperty.isFilterable() ||
      this.props.addFilters === undefined
    ) {
      return <td />;
    }

    const applyFilterButton = (
      <EuiButtonEmpty
        size="xs"
        title={i18n.translate('xpack.maps.tooltip.filterOnPropertyTitle', {
          defaultMessage: 'Filter on property',
        })}
        onClick={async () => {
          this.props.onCloseTooltip();
          const filters = await tooltipProperty.getESFilters();
          this.props.addFilters!(filters, ACTION_GLOBAL_APPLY_FILTER);
        }}
        aria-label={i18n.translate('xpack.maps.tooltip.filterOnPropertyAriaLabel', {
          defaultMessage: 'Filter on property',
        })}
        data-test-subj="mapTooltipCreateFilterButton"
      >
        <EuiIcon type="filter" />
      </EuiButtonEmpty>
    );

    return this.props.getActionContext === undefined ||
      this.state.actions.length === 0 ||
      (this.state.actions.length === 1 &&
        this.state.actions[0].id === ACTION_GLOBAL_APPLY_FILTER) ? (
      <td>{applyFilterButton}</td>
    ) : (
      <td className="mapFeatureTooltip_actionsRow">
        <span>
          {applyFilterButton}
          <EuiButtonEmpty
            size="xs"
            title={i18n.translate('xpack.maps.tooltip.viewActionsTitle', {
              defaultMessage: 'View filter actions',
            })}
            onClick={() => {
              this._showFilterActions(
                tooltipProperty,
                this.props.getActionContext!,
                this.props.addFilters!
              );
            }}
            aria-label={i18n.translate('xpack.maps.tooltip.viewActionsTitle', {
              defaultMessage: 'View filter actions',
            })}
            data-test-subj="mapTooltipMoreActionsButton"
          >
            <EuiIcon type="arrowRight" />
          </EuiButtonEmpty>
        </span>
      </td>
    );
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
      const style: CSSProperties = {};
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
      return (
        <tr key={tooltipProperty.getPropertyKey()} className="mapFeatureTooltip_row">
          <td className="eui-textOverflowWrap mapFeatureTooltip__propertyLabel">
            {tooltipProperty.getPropertyName()}
          </td>
          <td className="eui-textOverflowWrap">{tooltipProperty.getHtmlDisplayValue()}</td>
          {this._renderFilterCell(tooltipProperty)}
        </tr>
      );
    });

    return (
      <table className="eui-yScrollWithShadows mapFeatureTooltip_table" ref={this._tableRef}>
        <tbody>{rows}</tbody>
      </table>
    );
  }
}
