/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFilePicker, EuiFormRow } from '@elastic/eui';

interface Props {
  onDbfSelect: (file: File | null) => void;
  onPrjSelect: (file: File | null) => void;
  onShxSelect: (file: File | null) => void;
}

export function ShapefileEditor(props: Props) {
  function onDbfSelect(files: FileList | null) {
    props.onDbfSelect(files && files.length ? files[0] : null);
  }

  function onPrjSelect(files: FileList | null) {
    props.onPrjSelect(files && files.length ? files[0] : null);
  }

  function onShxSelect(files: FileList | null) {
    props.onShxSelect(files && files.length ? files[0] : null);
  }

  return (
    <>
      <EuiFormRow>
        <EuiFilePicker
          initialPromptText={i18n.translate('xpack.fileUpload.shapefileEditor.dbfFilePicker', {
            defaultMessage: `Select '.dbf' file`,
          })}
          onChange={onDbfSelect}
          accept=".dbf"
          display="default"
        />
      </EuiFormRow>
      <EuiFormRow>
        <EuiFilePicker
          initialPromptText={i18n.translate('xpack.fileUpload.shapefileEditor.prjFilePicker', {
            defaultMessage: `Select '.prj' file`,
          })}
          onChange={onPrjSelect}
          accept=".prj"
          display="default"
        />
      </EuiFormRow>
      <EuiFormRow>
        <EuiFilePicker
          initialPromptText={i18n.translate('xpack.fileUpload.shapefileEditor.shxFilePicker', {
            defaultMessage: `Select '.shx' file`,
          })}
          onChange={onShxSelect}
          accept=".shx"
          display="default"
        />
      </EuiFormRow>
    </>
  );
}
