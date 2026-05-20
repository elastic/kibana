import React from 'react';
/**
 * Unified search bar for service map pages.
 *
 * - Renders the APM KQL search bar (time comparison + filter pills, no env dropdown)
 *   followed by Controls API dropdown filters.
 * - Subscribes to filterManager so filter-bar pill changes are captured.
 * - Initialises the Controls environment dropdown from the `environment` URL param.
 * - Writes the environment back to the URL when the user changes it via Controls,
 *   keeping the URL bookmarkable.
 * - Builds a single ES query via `buildEsQuery` and stores it in
 *   ServiceMapSearchContext so `useServiceMap` can send it to the server.
 */
export declare function ServiceMapSearchBar(): React.JSX.Element;
