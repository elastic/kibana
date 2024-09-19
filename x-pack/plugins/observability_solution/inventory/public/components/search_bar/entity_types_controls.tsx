/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { css } from '@emotion/react';
import { EntityType } from '../../../common/entities';
import { getEntityTypeLabel } from '../../utils/get_entity_type_label';

const entityTypes: EntityType[] = ['service', 'host', 'container'];
const options = entityTypes.map((type) => ({ key: type, label: getEntityTypeLabel(type) }));

// interface Props {

// }

export function EntityTypesControls() {
  const [selectedOptions, setSelected] = useState<Array<EuiComboBoxOptionOption<EntityType>>>([]);

  return (
    <EuiComboBox<EntityType>
      css={css`
        max-width: 325px;
      `}
      aria-label={i18n.translate(
        'xpack.inventory.entityTypesControls.euiComboBox.accessibleScreenReaderLabel',
        { defaultMessage: 'Entity types filter' }
      )}
      placeholder="Entity type"
      options={options}
      selectedOptions={selectedOptions}
      onChange={(newOptions) => {
        setSelected(newOptions);
      }}
      isClearable={true}
    />
  );
}
