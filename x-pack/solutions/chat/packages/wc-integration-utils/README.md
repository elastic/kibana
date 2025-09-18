# @kbn/wc-integration-utils

Integration utilities for chat solutions in Kibana. This package provides tools for Elasticsearch integration, search schema generation, and data processing specifically designed for chat and AI-powered features.

## Overview

The `@kbn/wc-integration-utils` package contains specialized utilities for integrating chat solutions with Elasticsearch and Kibana. It provides tools for field analysis, search schema generation, and content processing that enable AI-powered chat features to effectively query and understand data.

## Package Details

- **Package Type**: Part of chat solutions
- **Location**: `x-pack/solutions/chat/packages`
- **Dependencies**: Elasticsearch client libraries

## Core Components

### Elasticsearch Integration
Tools for interacting with Elasticsearch data:

- `getFieldsTopValues()` - Retrieve top values for specified fields
- `getFieldTypeByPath()` - Determine field types from field paths

### Search Tools
Utilities for search schema generation and query processing:

- `generateSearchSchema()` - Generate search schemas for data sources
- `createFilterClauses()` - Create filter clauses for search queries  
- `hitToContent()` - Convert search hits to content format

### Type Definitions
- `SearchFilter` - Type definitions for search filter objects

## Usage Examples

### Field Analysis
```typescript
import { getFieldsTopValues, getFieldTypeByPath } from '@kbn/wc-integration-utils';

// Get top values for specific fields
const topValues = await getFieldsTopValues(client, {
  index: 'logs-*',
  fields: ['user.name', 'event.action'],
  size: 10
});

// Determine field type
const fieldType = getFieldTypeByPath(mapping, 'user.email');
console.log(fieldType); // 'keyword', 'text', etc.
```

### Search Schema Generation
```typescript
import { generateSearchSchema, type SearchFilter } from '@kbn/wc-integration-utils';

// Generate search schema for data source
const schema = await generateSearchSchema({
  client: esClient,
  index: 'logs-application-*',
  sampleSize: 1000
});

console.log(schema); // Generated schema for AI understanding
```

### Query Processing
```typescript
import { createFilterClauses, hitToContent } from '@kbn/wc-integration-utils';

// Create filter clauses from search parameters
const filters: SearchFilter[] = [
  { field: 'user.name', value: 'john', operator: 'equals' },
  { field: 'timestamp', value: '2024-01-01', operator: 'gte' }
];

const filterClauses = createFilterClauses(filters);

// Convert search hits to content
const searchHits = await client.search({ 
  index: 'docs-*',
  body: { query: { bool: { filter: filterClauses } } }
});

const content = searchHits.hits.hits.map(hit => hitToContent(hit));
```

### Integration with Chat Features
```typescript
import { 
  generateSearchSchema, 
  getFieldsTopValues,
  hitToContent 
} from '@kbn/wc-integration-utils';

class ChatDataSource {
  async initialize() {
    // Generate schema for AI understanding
    this.schema = await generateSearchSchema({
      client: this.esClient,
      index: this.indexPattern,
      includeMetadata: true
    });
    
    // Get field value examples
    this.fieldExamples = await getFieldsTopValues(this.esClient, {
      index: this.indexPattern,
      fields: this.schema.fields,
      size: 5
    });
  }
  
  async search(query: string, filters: SearchFilter[]) {
    const filterClauses = createFilterClauses(filters);
    
    const results = await this.esClient.search({
      index: this.indexPattern,
      body: {
        query: {
          bool: {
            must: { match: { content: query } },
            filter: filterClauses
          }
        }
      }
    });
    
    return results.hits.hits.map(hit => hitToContent(hit));
  }
}
```

## Search Filter Types

### SearchFilter Interface
```typescript
interface SearchFilter {
  field: string;
  value: string | number | boolean;
  operator: 'equals' | 'contains' | 'gte' | 'lte' | 'exists';
  boost?: number;
}
```

## Integration Points

### Chat Solutions
This package is specifically designed for Kibana's chat solutions, providing the data integration layer that enables AI-powered features to understand and query Elasticsearch data effectively.

### AI Integration
The utilities help bridge the gap between natural language chat interfaces and structured Elasticsearch queries, enabling more intuitive data exploration through conversational interfaces.

### Schema Generation
Automated schema generation helps AI systems understand the structure and content of data sources, enabling more accurate and relevant responses to user queries.

This package serves as the foundational data integration layer for chat solutions in Kibana, enabling AI-powered features to effectively understand, query, and present Elasticsearch data through conversational interfaces.
