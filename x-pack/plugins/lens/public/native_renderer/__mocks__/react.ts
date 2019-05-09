/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

// This mock overwrites react to use the layout effect hook instead of the normal one.
// This is done to have effects executed synchronously to be able to test them without
// setTimeout hacks.

// eslint-disable-next-line import/no-default-export
export default { ...React, useEffect: React.useLayoutEffect };
