/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default {
  edit: () => {
    return {
      navigateFileEnd() {},
      destroy() {},
      acequire() {
        return {
          setCompleters() {},
        };
      },
      setValue() {},
      setOptions() {},
      setTheme() {},
      setFontSize() {},
      setShowPrintMargin() {},
      getSession() {
        return {
          setUseWrapMode() {},
          setMode() {},
          setValue() {},
          on() {},
        };
      },
      renderer: {
        setShowGutter() {},
        setScrollMargin() {},
      },
      setBehavioursEnabled() {},
    };
  },
  acequire() {
    return {
      setCompleters() {},
    };
  },
  setCompleters() {
    return [{}];
  },
};
