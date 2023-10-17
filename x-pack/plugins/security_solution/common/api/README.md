To generate the files in the bundles directory, which have the shared components added to each file, 
[install redocly CLI](https://redocly.com/docs/cli/installation/) and run this bundle command:

npx @redocly/cli bundle --output bundles --ext json \
endpoint/actions/actions.schema.yaml \
endpoint/actions/actions_status.schema.yaml \
endpoint/actions/audit_log.schema.yaml \
endpoint/actions/details.schema.yaml \
endpoint/actions/execute.schema.yaml \
endpoint/actions/file_download.schema.yaml \
endpoint/actions/file_info.schema.yaml \
endpoint/actions/file_upload.schema.yaml \
endpoint/actions/get_file.schema.yaml \
endpoint/actions/list.schema.yaml \
endpoint/metadata/metadata.schema.yaml \
endpoint/policy/policy.schema.yaml \
endpoint/suggestions/get_suggestions.schema.yaml \
detection_engine/prebuilt_rules/get_prebuilt_rules_and_timelines_status/get_prebuilt_rules_and_timelines_status_route.schema.yaml \
detection_engine/prebuilt_rules/install_prebuilt_rules_and_timelines/install_prebuilt_rules_and_timelines_route.schema.yaml \
detection_engine/rule_management/bulk_actions/bulk_actions_route.schema.yaml \
detection_engine/rule_management/bulk_crud/bulk_create_rules/bulk_create_rules_route.schema.yaml \
detection_engine/rule_management/bulk_crud/bulk_delete_rules/bulk_delete_rules_route.schema.yaml \
detection_engine/rule_management/bulk_crud/bulk_patch_rules/bulk_patch_rules_route.schema.yaml \
detection_engine/rule_management/bulk_crud/bulk_update_rules/bulk_update_rules_route.schema.yaml \
detection_engine/rule_management/crud/create_rule/create_rule_route.schema.yaml \
detection_engine/rule_management/crud/delete_rule/delete_rule_route.schema.yaml \
detection_engine/rule_management/crud/patch_rule/patch_rule_route.schema.yaml \
detection_engine/rule_management/crud/read_rule/read_rule_route.schema.yaml \
detection_engine/rule_management/crud/update_rule/update_rule_route.schema.yaml \
detection_engine/rule_management/export_rules/export_rules_route.schema.yaml \
detection_engine/rule_management/import_rules/import_rules_route.schema.yaml \
detection_engine/rule_management/read_tags/read_tags_route.schema.yaml \
detection_engine/rule_monitoring/rule_execution_logs/get_rule_execution_events/get_rule_execution_events_route.schema.yaml \
detection_engine/rule_monitoring/rule_execution_logs/get_rule_execution_results/get_rule_execution_results_route.schema.yaml \
timeline/clean_draft_timelines/clean_draft_timelines_route_schema.yaml \
timeline/create_timelines/create_timelines_route_schema.yaml \
timeline/delete_note/delete_note_route_schema.yaml \
timeline/delete_timelines/delete_timelines_route_schema.yaml \
timeline/export_timelines/export_timelines_route_schema.yaml \
timeline/get_draft_timelines/get_draft_timelines_route_schema.yaml \
timeline/get_timeline/get_timeline_route_schema.yaml \
timeline/get_timelines/get_timelines_route_schema.yaml \
timeline/import_timelines/import_timelines_route_schema.yaml \
timeline/install_prepackaged_timelines/install_prepackaged_timelines_route_schema.yaml \
timeline/patch_timelines/patch_timeline_route_schema.yaml \
timeline/persist_favorite/persist_favorite_route_schema.yaml \
timeline/persist_note/persist_note_route_schema.yaml \
timeline/pinned_events/pinned_events_route_schema.yaml