/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useState } from 'react';
import { useBasePath } from '../../../../common/lib/kibana';
import { CursorPosition } from '../../../../common/components/markdown_editor';
import { FormData, FormHook } from '../../../../shared_imports';

export const useInsertTimeline = <T extends FormData>(form: FormHook<T>, fieldName: string) => {
  const basePath = window.location.origin + useBasePath();
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    start: 0,
    end: 0,
  });
  const handleOnTimelineChange = useCallback(
    (title: string, id: string | null) => {
      const builtLink = `${basePath}/app/security/timelines?timeline=(id:'${id}',isOpen:!t)`;
      const currentValue = form.getFormData()[fieldName];
      const newValue: string = [
        currentValue.slice(0, cursorPosition.start),
        cursorPosition.start === cursorPosition.end
          ? `[${title}](${builtLink})`
          : `[${currentValue.slice(cursorPosition.start, cursorPosition.end)}](${builtLink})`,
        currentValue.slice(cursorPosition.end),
      ].join('');
      form.setFieldValue(fieldName, newValue);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form]
  );
  const handleCursorChange = useCallback(
    (cp: CursorPosition) => {
      setCursorPosition(cp);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cursorPosition]
  );
  return {
    cursorPosition,
    handleCursorChange,
    handleOnTimelineChange,
  };
};
