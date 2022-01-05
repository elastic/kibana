/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Careful of exporting anything from this file as any file(s) you export here will cause your functions to be exposed as public.
// If you're using functions/types/etc... internally or within integration tests it's best to import directly from their paths
// than expose the functions/types/etc... here. You should _only_ expose functions/types/etc... that need to be shared with other plugins here.
// When you do have to add things here you might want to consider creating a package such to share with other plugins instead as packages
// are easier to break down.
// See: https://docs.elastic.dev/kibana-dev-docs/key-concepts/platform-intro#public-plugin-api
