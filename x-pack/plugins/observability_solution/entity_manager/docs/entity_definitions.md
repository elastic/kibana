### Entity Definitions

Entity definitions are a core concept of the entity model. They define the way to locate, aggregate and extract a specific type of entity documents from source indices. Definitions are stored as Kibana saved objects and serve as the input to build ingested pipelines and transforms that will actually collect and store the data.

#### Builtin Definitions

Entity discovery is an aggregation of _builtin_ definitions (stored in [builtin directory](../server/lib/entities/built_in)) that Elastic defines and maintains. Because we want to provide updates to existing definitions but also install new ones with future releases, we need a way to perform these actions automatically on behalf of users. To achieve that we ask for an initial _enablement_ step that creates an API key stored as an encrypted saved object. The API key is generated through a REST endpoint and is created with the credentials of the user calling that endpoint. The key requires specific privileges to install/kickoff the transforms (see privileges [here](../server/lib/auth/privileges.ts)). Once a valid key is stored, any actions performed on builtin definitions are made through that key.