/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * SML type that deliberately omits the `getPermissions` hook. Per the
 * `SmlTypeDefinition.getPermissions` contract, its entries must be readable by any caller in the
 * spaces they were indexed for — the indexer stamps a `count: 0` privilege element per space and
 * the read filter admits it on space scoping alone.
 */
export const SML_TEST_PUBLIC_KI_TYPE = 'sml_test_public';

/**
 * SML type that implements `getPermissions`, gating its entries on
 * `ai_index:sml_test_gated/read`. The control for the public type above: proves the visibility
 * filter still denies, so a "public entry is visible" assertion cannot pass vacuously because
 * authorization stopped working altogether.
 */
export const SML_TEST_GATED_KI_TYPE = 'sml_test_gated';

/** Feature granting `ai_index:sml_test_gated/read`, and nothing else. */
export const SML_TEST_GATED_FEATURE_ID = 'smlTestGatedType';

/** The single origin both fixture types list. */
export const SML_TEST_ORIGIN_ID = 'sml-test-fixture-origin';

/**
 * Distinctive token stamped into both fixture entries' title and content so a search can address
 * them without colliding with anything else in the corpus.
 */
export const SML_TEST_SEARCH_TOKEN = 'smltestfixturetoken';

/** Space the fixture entries are indexed for. Cross-space assertions depend on it being just one. */
export const SML_TEST_SPACE_ID = 'default';
