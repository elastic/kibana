/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kebabCase } from 'lodash';
import { EuiLink, EuiFormRow, EuiFilePicker, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const SUPPORTED_PACK_EXTENSIONS = ['application/json', 'text/plain'];

const ExamplePackLink = React.memo(() => (
  <EuiLink href="https://github.com/osquery/osquery/tree/master/packs" target="_blank">
    <FormattedMessage
      id="xpack.osquery.packUploader.examplePacksLinkLabel"
      defaultMessage="Example packs"
    />
  </EuiLink>
));

ExamplePackLink.displayName = 'ExamplePackLink';

interface OsqueryPackUploaderProps {
  onChange: (payload: Record<string, unknown>, packName: string) => void;
}

const OsqueryPackUploaderComponent: React.FC<OsqueryPackUploaderProps> = ({ onChange }) => {
  const packName = useRef('');
  const filePickerRef = useRef<EuiFilePicker>(null);
  const [isInvalid, setIsInvalid] = useState<string | null>(null);
  // @ts-expect-error update types
  let fileReader;

  const handleFileRead = () => {
    // @ts-expect-error update types
    const content = fileReader.result;

    let parsedContent;

    try {
      parsedContent = JSON.parse(content.replaceAll('\\\n', ''), (key, value) => {
        if (key === 'query') {
          // remove any multiple spaces from the query
          return value.replaceAll(/\s(?=\s)/gm, '');
        }

        if (key === 'interval') {
          // convert interval int to string
          return `${value}`;
        }

        return value;
      });

      setIsInvalid(null);
    } catch (error) {
      setIsInvalid(error);
      // @ts-expect-error update types
      filePickerRef.current?.removeFiles(new Event('fake'));
    }

    if (!parsedContent?.queries) {
      return;
    }

    onChange(parsedContent, packName.current);
    // @ts-expect-error update types
    filePickerRef.current?.removeFiles(new Event('fake'));
  };

  // @ts-expect-error update types
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleFileChosen = (file) => {
    fileReader = new FileReader();
    fileReader.onloadend = handleFileRead;
    fileReader.readAsText(file);
  };

  const handleInputChange = useCallback(
    (inputFiles) => {
      if (!inputFiles.length) {
        packName.current = '';

        return;
      }

      if (
        inputFiles.length &&
        ((!!inputFiles[0].type.length && !SUPPORTED_PACK_EXTENSIONS.includes(inputFiles[0].type)) ??
          !inputFiles[0].name.endsWith('.conf'))
      ) {
        packName.current = '';
        setIsInvalid(
          i18n.translate('xpack.osquery.packUploader.unsupportedFileTypeText', {
            defaultMessage:
              'File type {fileType} is not supported, please upload {supportedFileTypes} config file',
            values: {
              fileType: inputFiles[0].type,
              supportedFileTypes: SUPPORTED_PACK_EXTENSIONS.join(' or '),
            },
          })
        );
        // @ts-expect-error update types
        filePickerRef.current?.removeFiles(new Event('fake'));

        return;
      }

      packName.current = kebabCase(inputFiles[0].name.split('.')[0]);
      handleFileChosen(inputFiles[0]);
    },
    [handleFileChosen]
  );

  return (
    <>
      <EuiSpacer size="xl" />
      <EuiFormRow
        fullWidth
        labelAppend={<ExamplePackLink />}
        isInvalid={!!isInvalid}
        error={<>{`${isInvalid}`}</>}
      >
        <EuiFilePicker
          ref={filePickerRef}
          id="osquery_pack_picker"
          initialPromptText={i18n.translate('xpack.osquery.packUploader.initialPromptTextLabel', {
            defaultMessage: 'Select or drag and drop osquery pack config file',
          })}
          onChange={handleInputChange}
          display="large"
          fullWidth
          isInvalid={!!isInvalid}
          accept={SUPPORTED_PACK_EXTENSIONS.join(',')}
        />
      </EuiFormRow>
    </>
  );
};

export const OsqueryPackUploader = React.memo(OsqueryPackUploaderComponent);
