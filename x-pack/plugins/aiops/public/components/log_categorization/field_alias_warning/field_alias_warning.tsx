/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut } from '@elastic/eui';
import { useIsFieldAlias } from './use_is_field_alias';

interface Props {
  index: string;
  selectedField: string;
}

export const FieldAliasWarning: FC<Props> = ({ index, selectedField }) => {
  const { isFieldAlias, cancelRequest } = useIsFieldAlias();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(
    function cancelRequestOnLeave() {
      return () => {
        cancelRequest();
      };
    },
    [cancelRequest]
  );

  useEffect(() => {
    setShowWarning(false);
    if (index && selectedField) {
      isFieldAlias(index, selectedField).then((res) => {
        setShowWarning(res);
      });
    }
  }, [index, selectedField, isFieldAlias]);

  if (showWarning === false) {
    return null;
  }

  return (
    <EuiCallOut color="warning">
      <FormattedMessage
        id="xpack.aiops.logCategorization.fieldAliasWarning"
        defaultMessage="The selected field is an alias, example documents cannot be displayed. Showing pattern tokens instead."
      />
    </EuiCallOut>
  );
};
