/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export const downloadWorkpad = async (workpadId) => console.log(`Download workpad ${workpadId}`);

export const downloadRenderedWorkpad = async (renderedWorkpad) =>
  console.log(`Download workpad ${renderedWorkpad.id}`);

export const downloadRuntime = async (basePath) => console.log(`Download run time at ${basePath}`);

export const downloadZippedRuntime = async (data) => console.log(`Downloading data ${data}`);
