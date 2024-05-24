import { EcsMappingState } from "../types/EcsMapping";
import { CategorizationState } from "../types/Categorization";
import { RelatedState } from "../types/Related";
import { Client } from "@elastic/elasticsearch";

interface DocTemplate {
  _index: string;
  _id: string;
  _source: {
    message: string;
  };
}

function formatSample(sample: string): DocTemplate {
  const docsTemplate: DocTemplate = {
    _index: "index",
    _id: "id",
    _source: { message: "" },
  };
  const formatted: DocTemplate = { ...docsTemplate };
  formatted._source.message = sample;
  return formatted;
}

function newClient(): Client {
  const client = new Client({
    node: "https://localhost:9200",
    auth: {
      username: "elastic",
      password: "changeme",
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
  return client;
}

async function _testPipeline(
  samples: string[],
  pipeline: object
): Promise<[any[], any[]]> {
  const docs = samples.map((sample) => formatSample(sample));
  const results: object[] = [];
  const errors: object[] = [];

  const client = newClient();
  try {
    const output = await client.ingest.simulate({ docs, pipeline });
    for (const doc of output.docs) {
      if (doc.doc?._source?.error) {
        errors.push(doc.doc._source.error);
      } else if (doc.doc?._source) {
        results.push(doc.doc._source);
      }
    }
  } catch (e) {
    errors.push({ error: (e as Error).message });
  }

  return [errors, results];
}

export async function handleValidatePipeline(
  state: EcsMappingState | CategorizationState | RelatedState
): Promise<
  | Partial<CategorizationState>
  | Partial<RelatedState>
  | Partial<EcsMappingState>
> {
  const [errors, results] = await _testPipeline(
    state.rawSamples,
    state.currentPipeline
  );
  console.log("testing validate pipeline");
  console.log("errors", errors);
  //console.log("results", results);
  return {
    errors,
    pipelineResults: results,
    lastExecutedChain: "validate_pipeline",
  };
}
