/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSuperSelect } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui';
import type { FC } from 'react';
import React, { useState, useMemo } from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';
import type { RandomSampler } from './sampling_menu';
import { SamplingPanel } from './sampling_menu/sampling_panel';
import type { WidenessOption } from './log_categorization_for_embeddable';
import { WIDENESS } from './log_categorization_for_embeddable';

interface Props {
  randomSampler: RandomSampler;
  fields: DataViewField[];
  selectedField: DataViewField | null;
  setSelectedField: (field: DataViewField) => void;
  widenessOption: WidenessOption;
  setWidenessOption: (w: WidenessOption) => void;
  categoryCount: number | undefined;
  reload: () => void;
}

export const EmbeddableMenu: FC<Props> = ({
  randomSampler,
  fields,
  selectedField,
  setSelectedField,
  widenessOption,
  setWidenessOption,
  categoryCount,
  reload,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const togglePopover = () => setShowMenu(!showMenu);

  const fieldOptions = useMemo(
    () => fields.map((field) => ({ inputDisplay: field.name, value: field })),
    [fields]
  );

  const widenessOptions = Object.keys(WIDENESS).map((value) => ({
    inputDisplay: value,
    value: value as WidenessOption,
  }));

  const button = (
    <EuiButtonEmpty
      data-test-subj="aiopsEmbeddableMenuOptionsButton"
      size="s"
      iconType="arrowDown"
      iconSide="right"
      onClick={() => togglePopover()}
      css={{ marginTop: '4px', marginRight: '4px' }}
    >
      Options
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      id={'embeddableMenu'}
      button={button}
      isOpen={showMenu}
      closePopover={() => togglePopover()}
      panelPaddingSize="s"
      anchorPosition="downLeft"
    >
      <EuiPanel color="transparent" paddingSize="s" css={{ maxWidth: '400px' }}>
        <EuiTitle size="xxxs">
          <h3>
            <FormattedMessage
              id="xpack.aiops.logCategorization.embeddableMenu.patternAnalysisSettingsTitle"
              defaultMessage=" Pattern analysis settings"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFormRow
          data-test-subj="aiopsEmbeddableMenuSelectedFieldFormRow"
          label={i18n.translate(
            'xpack.aiops.logCategorization.embeddableMenu.selectedFieldRowLabel',
            {
              defaultMessage: 'Selected field',
            }
          )}
        >
          <EuiSuperSelect
            aria-label="Select a field"
            options={fieldOptions}
            valueOfSelected={selectedField ?? undefined}
            onChange={setSelectedField}
          />
        </EuiFormRow>

        <EuiHorizontalRule margin="m" />

        <EuiFormRow
          data-test-subj="aiopsRandomSamplerOptionsFormRow"
          label={i18n.translate(
            'xpack.aiops.logCategorization.embeddableMenu.widenessOptionsRowLabel',
            {
              defaultMessage: 'Minimum time range',
            }
          )}
          helpText={
            <>
              {categoryCount !== undefined && widenessOption !== 'No minimum' ? (
                <>
                  <FormattedMessage
                    id="xpack.aiops.logCategorization.embeddableMenu.totalPatternsMessage"
                    defaultMessage="Total patterns in {widenessOption}: {categoryCount}"
                    values={{ widenessOption, categoryCount }}
                  />
                </>
              ) : null}
            </>
          }
        >
          <EuiSuperSelect
            aria-label="Select a minimum time range"
            options={widenessOptions}
            valueOfSelected={widenessOption}
            onChange={setWidenessOption}
          />
        </EuiFormRow>

        <EuiHorizontalRule margin="m" />

        <SamplingPanel randomSampler={randomSampler} reload={reload} />
      </EuiPanel>
    </EuiPopover>
  );
};
