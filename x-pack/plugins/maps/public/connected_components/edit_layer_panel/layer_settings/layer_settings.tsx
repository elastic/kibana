/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Fragment } from 'react';
import {
  EuiCallOut,
  EuiText,
  EuiTitle,
  EuiPanel,
  EuiFormRow,
  EuiFieldText,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ValidatedDualRange } from '@kbn/kibana-react-plugin/public';
import { Attribution } from '../../../../common/descriptor_types';
import { AUTOSELECT_EMS_LOCALE, NO_EMS_LOCALE, MAX_ZOOM } from '../../../../common/constants';
import { AlphaSlider } from '../../../components/alpha_slider';
import { ILayer } from '../../../classes/layers/layer';
import { isVectorLayer } from '../../../classes/layers/vector_layer';
import { AttributionFormRow } from './attribution_form_row';
import { isLayerGroup } from '../../../classes/layers/layer_group';

export interface Props {
  layer: ILayer;
  clearLayerAttribution: (layerId: string) => void;
  setLayerAttribution: (id: string, attribution: Attribution) => void;
  updateLabel: (layerId: string, label: string) => void;
  updateLocale: (layerId: string, locale: string) => void;
  updateMinZoom: (layerId: string, minZoom: number) => void;
  updateMaxZoom: (layerId: string, maxZoom: number) => void;
  updateAlpha: (layerId: string, alpha: number) => void;
  updateLabelsOnTop: (layerId: string, areLabelsOnTop: boolean) => void;
  updateIncludeInFitToBounds: (layerId: string, includeInFitToBounds: boolean) => void;
  updateDisableTooltips: (layerId: string, disableTooltips: boolean) => void;
  supportsFitToBounds: boolean;
}

export function LayerSettings(props: Props) {
  const minVisibilityZoom = props.layer.getMinSourceZoom();
  const maxVisibilityZoom = MAX_ZOOM;
  const layerId = props.layer.getId();

  const onLabelChange = (event: ChangeEvent<HTMLInputElement>) => {
    const label = event.target.value;
    props.updateLabel(layerId, label);
  };

  const onLocaleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    if (value) props.updateLocale(layerId, value);
  };

  const onZoomChange = (value: [string, string]) => {
    props.updateMinZoom(layerId, Math.max(minVisibilityZoom, parseInt(value[0], 10)));
    props.updateMaxZoom(layerId, Math.min(maxVisibilityZoom, parseInt(value[1], 10)));
  };

  const onAlphaChange = (alpha: number) => {
    props.updateAlpha(layerId, alpha);
  };

  const onLabelsOnTopChange = (event: EuiSwitchEvent) => {
    props.updateLabelsOnTop(layerId, event.target.checked);
  };

  const onShowTooltipsChange = (event: EuiSwitchEvent) => {
    props.updateDisableTooltips(layerId, !event.target.checked);
  };

  const includeInFitToBoundsChange = (event: EuiSwitchEvent) => {
    props.updateIncludeInFitToBounds(layerId, event.target.checked);
  };

  const onAttributionChange = (attribution?: Attribution) => {
    if (attribution) {
      props.setLayerAttribution(layerId, attribution);
    } else {
      props.clearLayerAttribution(layerId);
    }
  };

  const renderIncludeInFitToBounds = () => {
    if (!props.supportsFitToBounds || isLayerGroup(props.layer)) {
      return null;
    }
    return (
      <EuiFormRow display="columnCompressed">
        <EuiToolTip
          position="top"
          content={i18n.translate('xpack.maps.layerPanel.settingsPanel.fittableFlagTooltip', {
            defaultMessage: `Fit to data bounds adjusts your map extent to show all of your data. Layers may provide reference data and should not be included in the fit to data bounds computation. Use this option to exclude a layer from fit to data bounds computation.`,
          })}
        >
          <EuiSwitch
            label={i18n.translate('xpack.maps.layerPanel.settingsPanel.fittableFlagLabel', {
              defaultMessage: `Include layer in fit to data bounds computation`,
            })}
            checked={props.layer.isIncludeInFitToBounds()}
            onChange={includeInFitToBoundsChange}
            data-test-subj="mapLayerPanelFittableFlagCheckbox"
            compressed
          />
        </EuiToolTip>
      </EuiFormRow>
    );
  };

  const renderZoomSliders = () => {
    return isLayerGroup(props.layer) ? null : (
      <ValidatedDualRange
        label={i18n.translate('xpack.maps.layerPanel.settingsPanel.visibleZoomLabel', {
          defaultMessage: 'Visibility',
        })}
        formRowDisplay="columnCompressed"
        min={minVisibilityZoom}
        max={maxVisibilityZoom}
        value={[props.layer.getMinZoom(), props.layer.getMaxZoom()]}
        showInput="inputWithPopover"
        showRange
        showLabels
        onChange={onZoomChange}
        allowEmptyRange={false}
        compressed
        prepend={i18n.translate('xpack.maps.layerPanel.settingsPanel.visibleZoom', {
          defaultMessage: 'Zoom levels',
        })}
      />
    );
  };

  const renderLabel = () => {
    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.layerPanel.settingsPanel.layerNameLabel', {
          defaultMessage: 'Name',
        })}
        display="columnCompressed"
      >
        <EuiFieldText value={props.layer.getLabel()} onChange={onLabelChange} compressed />
      </EuiFormRow>
    );
  };

  const renderShowLabelsOnTop = () => {
    if (!props.layer.supportsLabelsOnTop()) {
      return null;
    }

    return (
      <EuiFormRow display="columnCompressed">
        <EuiSwitch
          label={i18n.translate('xpack.maps.layerPanel.settingsPanel.labelsOnTop', {
            defaultMessage: `Show labels on top`,
          })}
          checked={props.layer.areLabelsOnTop()}
          onChange={onLabelsOnTopChange}
          data-test-subj="mapLayerPanelApplyGlobalQueryCheckbox"
          compressed
        />
      </EuiFormRow>
    );
  };

  const renderDisableTooltips = () => {
    return !isVectorLayer(props.layer) ? null : (
      <EuiFormRow display="columnCompressed">
        <EuiSwitch
          label={i18n.translate('xpack.maps.layerPanel.settingsPanel.DisableTooltips', {
            defaultMessage: `Show tooltips`,
          })}
          disabled={!props.layer.canShowTooltip()}
          checked={!props.layer.areTooltipsDisabled()}
          onChange={onShowTooltipsChange}
          compressed
        />
      </EuiFormRow>
    );
  };

  const renderShowLocaleSelector = () => {
    if (!props.layer.supportsLabelLocales()) {
      return null;
    }

    const options = [
      {
        text: i18n.translate(
          'xpack.maps.layerPanel.settingsPanel.labelLanguageAutoselectDropDown',
          {
            defaultMessage: 'Autoselect based on Kibana locale',
          }
        ),
        value: AUTOSELECT_EMS_LOCALE,
      },
      { value: 'ar', text: 'العربية' },
      { value: 'de', text: 'Deutsch' },
      { value: 'en', text: 'English' },
      { value: 'es', text: 'Español' },
      { value: 'fr-fr', text: 'Français' },
      { value: 'hi-in', text: 'हिन्दी' },
      { value: 'it', text: 'Italiano' },
      { value: 'ja-jp', text: '日本語' },
      { value: 'ko', text: '한국어' },
      { value: 'pt-pt', text: 'Português' },
      { value: 'ru-ru', text: 'русский' },
      { value: 'zh-cn', text: '简体中文' },
      {
        text: i18n.translate('xpack.maps.layerPanel.settingsPanel.labelLanguageNoneDropDown', {
          defaultMessage: 'None',
        }),
        value: NO_EMS_LOCALE,
      },
    ];

    return (
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.maps.layerPanel.settingsPanel.labelLanguageLabel', {
          defaultMessage: 'Label language',
        })}
      >
        <EuiSelect
          options={options}
          value={props.layer.getLocale() ?? NO_EMS_LOCALE}
          onChange={onLocaleChange}
          compressed
        />
      </EuiFormRow>
    );
  };

  const renderLayerGroupInstructions = () => {
    return isLayerGroup(props.layer) ? (
      <>
        <EuiCallOut
          title={i18n.translate('xpack.maps.layerPanel.settingsPanel.layerGroupCalloutTitle', {
            defaultMessage: 'Drag layers in and out of the group',
          })}
          iconType="layers"
        >
          <EuiText>
            <ul>
              <li>
                {i18n.translate('xpack.maps.layerPanel.settingsPanel.layerGroupAddToFront', {
                  defaultMessage: 'To add your first layer, drag it onto the group name.',
                })}
              </li>
              <li>
                {i18n.translate('xpack.maps.layerPanel.settingsPanel.layerGroupAddToPosition', {
                  defaultMessage:
                    'To add another layer, drag it anywhere above the last layer in the group.',
                })}
              </li>
              <li>
                {i18n.translate('xpack.maps.layerPanel.settingsPanel.layerGroupRemove', {
                  defaultMessage: 'To remove a layer, drag it above or below the group.',
                })}
              </li>
            </ul>
          </EuiText>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    ) : null;
  };

  return (
    <Fragment>
      {renderLayerGroupInstructions()}
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.maps.layerPanel.layerSettingsTitle"
              defaultMessage="Layer settings"
            />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />
        {renderLabel()}
        {renderZoomSliders()}
        {isLayerGroup(props.layer) ? null : (
          <AlphaSlider alpha={props.layer.getAlpha()} onChange={onAlphaChange} />
        )}
        {renderShowLabelsOnTop()}
        {renderShowLocaleSelector()}
        {isLayerGroup(props.layer) ? null : (
          <AttributionFormRow layer={props.layer} onChange={onAttributionChange} />
        )}
        {renderIncludeInFitToBounds()}
        {renderDisableTooltips()}
      </EuiPanel>

      <EuiSpacer size="s" />
    </Fragment>
  );
}
