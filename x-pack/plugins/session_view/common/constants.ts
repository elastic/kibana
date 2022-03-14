/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PROCESS_EVENTS_ROUTE = '/internal/session_view/process_events_route';
export const SESSION_ENTRY_LEADERS_ROUTE = '/internal/session_view/session_entry_leaders_route';
export const PROCESS_EVENTS_INDEX = 'logs-endpoint.events.process-default';
export const ALERTS_INDEX = '.siem-signals-default';
export const ENTRY_SESSION_ENTITY_ID_PROPERTY = 'process.entry_leader.entity_id';

// We fetch a large number of events per page to mitigate a few design caveats in session viewer
// 1. Due to the hierarchical nature of the data (e.g we are rendering a time ordered pid tree) there are common scenarios where there
//    are few top level processes, but many nested children. For example, a build script is run on a remote host via ssh. If for example our page
//    size is 10 and the build script has 500 nested children, the user would see a load more button that they could continously click without seeing
//    anychange since the next 10 events would be for processes nested under a top level process that might not be expanded. That being said, it's quite
//    possible there are build scripts with many thousands of events, in which case this initial large page will have the same issue. A technique used
//    in previous incarnations of session view included auto expanding the node which is receiving the new page of events so as to not confuse the user.
//    We may need to include this trick as part of this implementation as well.
// 2. The plain text search that comes with Session view is currently limited in that it only searches through data that has been loaded into the browser.
//    The large page size allows the user to get a broader set of results per page. That being said, this feature is kind of flawed since sessions could be many thousands
//    if not 100s of thousands of events, and to be required to page through these sessions to find more search matches is not a great experience. Future iterations of the
//    search functionality will instead use a separate ES backend search to avoid this.
// 3. Fewer round trips to the backend!
export const PROCESS_EVENTS_PER_PAGE = 1000;
