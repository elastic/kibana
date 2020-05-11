/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { ExpressionRenderHandler } from 'src/plugins/expressions/public';

import { ErrorMessage } from './error_message';
import { useExpressions } from '../hooks';

export const Preview: FC = () => {
  const { result } = useExpressions();
  const mountRef: React.MutableRefObject<null | HTMLDivElement> = useRef(null);
  const handlerRef: React.MutableRefObject<null | ExpressionRenderHandler> = useRef(null);
  const [renderError, setRenderError] = useState<Error | null>(null);

  useEffect(() => {
    if (mountRef.current) {
      handlerRef.current = new ExpressionRenderHandler(mountRef.current, {
        onRenderError: (element, error) => {
          setRenderError(error);
          if (element) {
            ReactDOM.unmountComponentAtNode(element);
          }
        },
      });
    }
  }, [mountRef]);

  useEffect(() => {
    if (mountRef.current && handlerRef.current) {
      if (!result) {
        ReactDOM.unmountComponentAtNode(mountRef.current);
        return;
      }

      handlerRef.current.render(result);
    }
  }, [result]);

  useEffect(
    () => () => {
      ReactDOM.unmountComponentAtNode(mountRef.current!);
      if (handlerRef && handlerRef.current) {
        handlerRef.current.destroy();
      }
    },
    []
  );

  const error = renderError ? <ErrorMessage error={renderError} /> : null;

  return (
    <div id="eePreview">
      <div id="eePreviewMountPoint" ref={mountRef} />
      {error}
    </div>
  );
};
