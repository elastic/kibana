/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useRef, useCallback, useState } from 'react';
import { HttpSetup } from 'kibana/public';
import { debounce } from 'lodash';

import { API_BASE_PATH } from '../../../common/constants';
import { Response, PayloadFormat, Payload } from '../types';
import { formatRequestPayload } from '../lib/format';

const DEBOUNCE_MS = 800;

export const useSubmitCode = (http: HttpSetup) => {
  const currentRequestIdRef = useRef(0);
  const [response, setResponse] = useState<Response | undefined>(undefined);
  const [inProgress, setInProgress] = useState(false);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const submit = useCallback(
    debounce(
      async (config: Payload) => {
        setInProgress(true);

        // Prevent an older request that resolves after a more recent request from clobbering it.
        // We store the resulting ID in this closure for comparison when the request resolves.
        const requestId = ++currentRequestIdRef.current;

        try {
          const result = await http.post(`${API_BASE_PATH}/execute`, {
            // Stringify the string, because http runs it through JSON.parse, and we want to actually
            // send a JSON string.
            body: JSON.stringify(formatRequestPayload(config, PayloadFormat.UGLY)),
          });

          if (currentRequestIdRef.current === requestId) {
            setResponse(result);
            setInProgress(false);
          }
          // else ignore this response...
        } catch (error) {
          if (currentRequestIdRef.current === requestId) {
            setResponse({
              error,
            });
            setInProgress(false);
          }
          // else ignore this response...
        }
      },
      DEBOUNCE_MS,
      { trailing: true }
    ),
    [http]
  );

  return {
    response,
    inProgress,
    submit,
  };
};
