export const legacySignalFieldMap = {
  'signal._meta.version': {
    type: 'long',
  },
  'signal.parent.rule': {
    type: 'keyword',
  },
  'signal.parent.index': {
    type: 'keyword',
  },
  'signal.parent.id': {
    type: 'keyword',
  },
  'signal.parent.type': {
    type: 'keyword',
  },
  'signal.parent.depth': {
    type: 'long',
  },
  'signal.parents.rule': {
    type: 'keyword',
  },
  'signal.parents.index': {
    type: 'keyword',
  },
  'signal.parents.id': {
    type: 'keyword',
  },
  'signal.parents.type': {
    type: 'keyword',
  },
  'signal.parents.depth': {
    type: 'long',
  },
  'signal.ancestors.rule': {
    type: 'keyword',
  },
  'signal.ancestors.index': {
    type: 'keyword',
  },
  'signal.ancestors.id': {
    type: 'keyword',
  },
  'signal.ancestors.type': {
    type: 'keyword',
  },
  'signal.ancestors.depth': {
    type: 'long',
  },
  'signal.group.id': {
    type: 'keyword',
  },
  'signal.group.index': {
    type: 'integer',
  },
  'signal.rule.id': {
    type: 'keyword',
  },
  'signal.rule.rule_id': {
    type: 'keyword',
  },
  'signal.rule.author': {
    type: 'keyword',
  },
  'signal.rule.building_block_type': {
    type: 'keyword',
  },
  'signal.rule.false_positives': {
    type: 'keyword',
  },
  'signal.rule.saved_id': {
    type: 'keyword',
  },
  'signal.rule.timeline_id': {
    type: 'keyword',
  },
  'signal.rule.timeline_title': {
    type: 'keyword',
  },
  'signal.rule.max_signals': {
    type: 'keyword',
  },
  'signal.rule.risk_score': {
    type: 'float',
  },
  'signal.rule.risk_score_mapping.field': {
    type: 'keyword',
  },
  'signal.rule.risk_score_mapping.operator': {
    type: 'keyword',
  },
  'signal.rule.risk_score_mapping.value': {
    type: 'keyword',
  },
  'signal.rule.output_index': {
    type: 'keyword',
  },
  'signal.rule.description': {
    type: 'keyword',
  },
  'signal.rule.from': {
    type: 'keyword',
  },
  'signal.rule.immutable': {
    type: 'keyword',
  },
  'signal.rule.index': {
    type: 'keyword',
  },
  'signal.rule.interval': {
    type: 'keyword',
  },
  'signal.rule.language': {
    type: 'keyword',
  },
  'signal.rule.license': {
    type: 'keyword',
  },
  'signal.rule.name': {
    type: 'keyword',
  },
  'signal.rule.rule_name_override': {
    type: 'keyword',
  },
  'signal.rule.query': {
    type: 'keyword',
  },
  'signal.rule.signal.rule.references': {
    type: 'keyword',
  },
  'signal.rule.severity': {
    type: 'keyword',
  },
  'signal.rule.severity_mapping.field': {
    type: 'keyword',
  },
  'signal.rule.severity_mapping.operator': {
    type: 'keyword',
  },
  'signal.rule.severity_mapping.value': {
    type: 'keyword',
  },
  'signal.rule.severity_mapping.severity': {
    type: 'keyword',
  },
  'signal.rule.tags': {
    type: 'keyword',
  },
  'signal.rule.threat.framework': {
    type: 'keyword',
  },
  'signal.rule.threat.tactic.id': {
    type: 'keyword',
  },
  'signal.rule.threat.tactic.name': {
    type: 'keyword',
  },
  'signal.rule.threat.tactic.reference': {
    type: 'keyword',
  },
  'signal.rule.threat.technique.id': {
    type: 'keyword',
  },
  'signal.rule.threat.technique.name': {
    type: 'keyword',
  },
  'signal.rule.threat.technique.reference': {
    type: 'keyword',
  },
  'signal.rule.threat.technique.subtechnique.id': {
    type: 'keyword',
  },
  'signal.rule.threat.technique.subtechnique.name': {
    type: 'keyword',
  },
  'signal.rule.threat.technique.subtechnique.reference': {
    type: 'keyword',
  },
  'signal.rule.threshold.field': {
    type: 'keyword',
  },
  'signal.rule.threshold.value': {
    type: 'float',
  },
  'signal.rule.threat_mapping.entries.field': {
    type: 'keyword',
  },
  'signal.rule.threat_mapping.entries.value': {
    type: 'keyword',
  },
  'signal.rule.threat_mapping.entries.type': {
    type: 'keyword',
  },
  'signal.rule.threat_filters': {
    type: 'object',
  },
  'signal.rule.threat_indicator_path': {
    type: 'keyword',
  },
  'signal.rule.threat_query': {
    type: 'keyword',
  },
  'signal.rule.threat_index': {
    type: 'keyword',
  },
  'signal.rule.threat_language': {
    type: 'keyword',
  },
  'signal.rule.note': {
    type: 'text',
  },
  'signal.rule.timestamp_override': {
    type: 'keyword',
  },
  'signal.rule.type': {
    type: 'keyword',
  },
  'signal.rule.size': {
    type: 'keyword',
  },
  'signal.rule.to': {
    type: 'keyword',
  },
  'signal.rule.enabled': {
    type: 'keyword',
  },
  'signal.rule.filters': {
    type: 'object',
  },
  'signal.rule.created_at': {
    type: 'date',
  },
  'signal.rule.updated_at': {
    type: 'date',
  },
  'signal.rule.created_by': {
    type: 'keyword',
  },
  'signal.rule.updated_by': {
    type: 'keyword',
  },
  'signal.rule.version': {
    type: 'keyword',
  },
  'signal.original_time': {
    type: 'date',
  },
  'signal.original_signal': {
    type: 'object',
    dynamic: false,
    enabled: false,
  },
  'signal.original_event.action': {
    type: 'keyword',
  },
  'signal.original_event.category': {
    type: 'keyword',
  },
  'signal.original_event.code': {
    type: 'keyword',
  },
  'signal.original_event.created': {
    type: 'date',
  },
  'signal.original_event.dataset': {
    type: 'keyword',
  },
  'signal.original_event.duration': {
    type: 'long',
  },
  'signal.original_event.end': {
    type: 'date',
  },
  'signal.original_event.hash': {
    type: 'keyword',
  },
  'signal.original_event.id': {
    type: 'keyword',
  },
  'signal.original_event.kind': {
    type: 'keyword',
  },
  'signal.original_event.module': {
    type: 'keyword',
  },
  'signal.original_event.original': {
    doc_values: false,
    index: false,
    type: 'keyword',
  },
  'signal.original_event.outcome': {
    type: 'keyword',
  },
  'signal.original_event.provider': {
    type: 'keyword',
  },
  'signal.original_event.risk_score': {
    type: 'float',
  },
  'signal.original_event.risk_score_norm': {
    type: 'float',
  },
  'signal.original_event.sequence': {
    type: 'long',
  },
  'signal.original_event.severity': {
    type: 'long',
  },
  'signal.original_event.start': {
    type: 'date',
  },
  'signal.original_event.timezone': {
    type: 'keyword',
  },
  'signal.original_event.type': {
    type: 'keyword',
  },
  'signal.status': {
    type: 'keyword',
  },
  'signal.threshold_count': {
    type: 'float',
  },
  'signal.threshold_result.from': {
    type: 'date',
  },
  'signal.threshold_result.terms.field': {
    type: 'keyword',
  },
  'signal.threshold_result.terms.value': {
    type: 'keyword',
  },
  'signal.threshold_result.cardinality.field': {
    type: 'keyword',
  },
  'signal.threshold_result.cardinality.value': {
    type: 'long',
  },
  'signal.threshold_result.count': {
    type: 'long',
  },
  'signal.depth': {
    type: 'integer',
  },
};
