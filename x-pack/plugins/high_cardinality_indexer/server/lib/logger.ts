import bunyan from 'bunyan';

export const logger = bunyan.createLogger({ name: 'high_cardinality_indexer' });