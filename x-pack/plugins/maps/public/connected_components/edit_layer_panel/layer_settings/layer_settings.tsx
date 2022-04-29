/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Fragment } from 'react';
import {
  EuiColorPicker,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiTitle,
  EuiPanel,
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { TMSService } from '@elastic/ems-client';
import { ValidatedDualRange } from '@kbn/kibana-react-plugin/public';
import { Attribution } from '../../../../common/descriptor_types';
import { MAX_ZOOM } from '../../../../common/constants';
import { AlphaSlider } from '../../../components/alpha_slider';
import { ILayer } from '../../../classes/layers/layer';
import { AttributionFormRow } from './attribution_form_row';

export interface Props {
  layer: ILayer;
  clearLayerAttribution: (layerId: string) => void;
  setLayerAttribution: (id: string, attribution: Attribution) => void;
  updateColorTheme: (layerId: string, color: string) => void;
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

  const onLocaleChange = (options: EuiComboBoxOptionOption[]) => {
    const { key } = options[0];
    if (key) props.updateLocale(layerId, key);
  };

  const onColorThemeChange = (color: string) => {
    props.updateColorTheme(layerId, color);
  }

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

  const renderShowLocaleSelector = () => {
    if (!props.layer.supportsLabelLocales()) {
      return null;
    }

    const options = [
      {
        key: 'default',
        label: i18n.translate('xpack.maps.layerPanel.settingsPanel.labelLanguageDefault', {
          defaultMessage: 'Default',
        }),
        value: 'default',
      },
      {
        key: 'autoselect',
        label: i18n.translate('xpack.maps.layerPanel.settingsPanel.labelLanguageAutoselect', {
          defaultMessage: 'Autoselect based on Kibana locale',
        }),
        value: 'autoselect',
      }
    ];

    options.push(...Object.entries(TMSService.SupportedLanguages).map(([key, { label, omtCode }]) => {
      const i18nLabel = i18n.translate(`xpack.maps.layerPanel.settingsPanel.labelLanguage${key}`, {
        defaultMessage: label,
      });
      return { key, label: i18nLabel, value: omtCode };
    }));

    return (
      <EuiFormRow
        display="columnCompressed"
        // TODO i18n
        label="Label language"
        helpText="Display labels in a different language"
      >
        <EuiComboBox
          options={options}
          singleSelection={{ asPlainText: true }}
          selectedOptions={options.filter(({ key }) => key === props.layer.getLocale())}
          onChange={onLocaleChange}
        />
      </EuiFormRow>
    );
  };

  const renderColorPicker = () => {
    if (!props.layer.supportsColorTheme()) {
      return null;
    }

    return (
      <EuiFormRow
        display="columnCompressed"
        label="Color theme"
        helpText="Apply a color theme to the basemap"
      >
      <EuiColorPicker
        color={props.layer.getColorTheme()}
        mode='default'
        onChange={onColorThemeChange}
      />

      </EuiFormRow>
    )
  }

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
        {renderShowLocaleSelector()}
        {renderColorPicker()}
        <AttributionFormRow layer={props.layer} onChange={onAttributionChange} />
        {renderIncludeInFitToBounds()}
      </EuiPanel>

      <EuiSpacer size="s" />
    </Fragment>
  );
}
