/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiLink } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { FrameType, getLanguageType } from '../../../common/profiling';

interface Props {
  frameType: FrameType;
}

export function MissingSymbolsCallout({ frameType }: Props) {
  const languageType = getLanguageType({ frameType });

  if (languageType === 'NATIVE') {
    return (
      <EuiCallOut
        title={i18n.translate(
          'xpack.profiling.frameInformationWindow.missingSymbols.native.title',
          { defaultMessage: 'Missing symbols' }
        )}
        color="warning"
        iconType="help"
      >
        <p>
          <FormattedMessage
            id="xpack.profiling.frameInformationWindow.missingSymbols.native"
            defaultMessage="To see function names and line numbers in traces of applications written in programming languages that compile to native code (C, C++, Rust, Go, etc.), you need to push symbols to the cluster. {readMore} how to do that or download the binary."
            values={{
              readMore: (
                <EuiLink href="#">
                  {i18n.translate(
                    'xpack.profiling.frameInformationWindow.missingSymbols.native.readMore',
                    { defaultMessage: 'Read more' }
                  )}
                </EuiLink>
              ),
            }}
          />
        </p>
        <EuiButton href="#" color="warning">
          {i18n.translate(
            'xpack.profiling.frameInformationWindow.missingSymbols.native.downloadBinary',
            { defaultMessage: 'Download elastic-profiling binary' }
          )}
        </EuiButton>
      </EuiCallOut>
    );
  }

  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.profiling.frameInformationWindow.missingSymbols.interpreted.title',
        { defaultMessage: 'Missing symbols error' }
      )}
      color="warning"
      iconType="help"
    >
      <p>
        <FormattedMessage
          id="xpack.profiling.frameInformationWindow.missingSymbols.interpreted"
          defaultMessage="There is an error in our unwinder for that language or there is some special case in that interpreter which we simply can't handle for whatever reason, and means the symbols are not available. {reportProblem}."
          values={{
            reportProblem: (
              <EuiLink href="#">
                {i18n.translate(
                  'xpack.profiling.frameInformationWindow.missingSymbols.interpreted.reportProblem',
                  { defaultMessage: 'Report a problem' }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiCallOut>
  );
}
