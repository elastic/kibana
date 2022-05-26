/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Fragment } from 'react';
import {
  EuiColorPicker,
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
import { Attribution, ColorFilter } from '../../../../common/descriptor_types';
import { AUTOSELECT_EMS_LOCALE, NO_EMS_LOCALE, MAX_ZOOM } from '../../../../common/constants';
import { AlphaSlider } from '../../../components/alpha_slider';
import { ILayer } from '../../../classes/layers/layer';
import { AttributionFormRow } from './attribution_form_row';

export interface Props {
  layer: ILayer;
  clearLayerAttribution: (layerId: string) => void;
  setLayerAttribution: (id: string, attribution: Attribution) => void;
  updateColorFilter: (layerId: string, colorFilter: ColorFilter) => void;
  updateLabel: (layerId: string, label: string) => void;
  updateLocale: (layerId: string, locale: string) => void;
  updateMinZoom: (layerId: string, minZoom: number) => void;
  updateMaxZoom: (layerId: string, maxZoom: number) => void;
  updateAlpha: (layerId: string, alpha: number) => void;
  updateLabelsOnTop: (layerId: string, areLabelsOnTop: boolean) => void;
  updateIncludeInFitToBounds: (layerId: string, includeInFitToBounds: boolean) => void;
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

  const onColorChange = (color: string) => {
    // TODO default operation does not change when selecting new basemap style
    // maybe we can move this to a layer action? more testing needed
    const { operation, percentage } = props.layer.getDefaultColorOperation();
    props.updateColorFilter(layerId, { color, operation, percentage });
  }

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
    if (!props.supportsFitToBounds) {
      return null;
    }
    return (
      <EuiFormRow display="columnCompressedSwitch">
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
    return (
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
      <EuiFormRow display="columnCompressedSwitch">
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

  const renderColorPicker = () => {
    if (!props.layer.supportsColorFilter()) {
      return null;
    }

    const { color } = props.layer.getColorFilter();

    return (
      <EuiFormRow display="columnCompressed"
        label={i18n.translate('xpack.maps.layerPanel.settingsPanel.colorFilterPickerLabel', {
          defaultMessage: "Color filter",
        })}
      >
        <EuiColorPicker
            compressed
            aria-label="Color"
            color={color}
            onChange={onColorChange}
            secondaryInputDisplay="top"
            isClearable
            format="hex"
            placeholder="No filter"
            aria-placeholder="No filter"
        />
      </EuiFormRow>
    )
  }
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

  return (
    <Fragment>
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
        <AlphaSlider alpha={props.layer.getAlpha()} onChange={onAlphaChange} />
        {renderShowLabelsOnTop()}
        <EuiSpacer size="m" />
        {renderColorPicker()}
        <EuiSpacer size="m" />
        {renderShowLocaleSelector()}
        <AttributionFormRow layer={props.layer} onChange={onAttributionChange} />
        {renderIncludeInFitToBounds()}
      </EuiPanel>

      <EuiSpacer size="s" />
    </Fragment>
  );
}
